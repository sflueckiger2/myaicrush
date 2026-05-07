/*
  mage_cdp.js — drive a real Chrome instance via CDP (Chrome DevTools Protocol)
  using Playwright's connectOverCDP.

  Setup (one time per machine):
    1. Server can launch Chrome itself with `launchChrome()` below — this opens
       a dedicated profile under tools/anong/.mage-chrome-profile, with the
       remote debugging port open on 9222.
    2. The user logs in to mage.space ONCE in that browser, picks Mango 2 + 9:16.
    3. After that, the server can attach via `connect()` and inject the runner
       on demand (no console pasting ever again).
*/

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const { chromium } = require('playwright');

const CDP_PORT = 9222;
const PROFILE_DIR = path.join(__dirname, '.mage-chrome-profile');

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_PATHS) if (fs.existsSync(p)) return p;
  return null;
}

function isCdpAlive() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:' + CDP_PORT + '/json/version', (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve(res.statusCode === 200));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

async function launchChrome() {
  if (await isCdpAlive()) return { ok: true, alreadyRunning: true };
  const exe = findChrome();
  if (!exe) return { ok: false, error: 'Chrome.exe not found. Set CHROME_PATH env var.' };
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const args = [
    '--remote-debugging-port=' + CDP_PORT,
    '--user-data-dir=' + PROFILE_DIR,
    '--no-first-run',
    '--no-default-browser-check',
    '--restore-last-session',
    '--disable-features=ChromeWhatsNewUI',
    'https://www.mage.space/explore',
  ];
  const child = spawn(exe, args, { detached: true, stdio: 'ignore' });
  child.unref();
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isCdpAlive()) return { ok: true, launched: true };
  }
  return { ok: false, error: 'Chrome did not open the debug port within 15s' };
}

async function connect() {
  if (!(await isCdpAlive())) {
    const r = await launchChrome();
    if (!r.ok) throw new Error(r.error);
  }
  const browser = await chromium.connectOverCDP('http://127.0.0.1:' + CDP_PORT);
  return browser;
}

async function findOrCreateMageTab(browser) {
  // Use the first context (the persistent one) — a CDP-attached browser
  // exposes existing windows as contexts.
  const contexts = browser.contexts();
  const ctx = contexts[0] || await browser.newContext();
  let page = ctx.pages().find((p) => /mage\.space/.test(p.url()));
  if (!page) {
    page = await ctx.newPage();
    await page.goto('https://www.mage.space/explore', { waitUntil: 'domcontentloaded' });
  } else if (!/mage\.space\/explore/.test(page.url())) {
    await page.goto('https://www.mage.space/explore', { waitUntil: 'domcontentloaded' });
  }
  return page;
}

async function waitForMageReady(page, timeoutMs) {
  const t0 = Date.now();
  // We wait for the prompt drawer's contenteditable to exist AND for the
  // model label to be visible (Mango 2 / Mango 1 / etc.).
  while (Date.now() - t0 < timeoutMs) {
    const ready = await page.evaluate(() => {
      const ce = document.querySelector('[contenteditable="true"]');
      const labels = Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim());
      const hasModel = labels.some((t) => /mango|fast|character|reference/i.test(t));
      return Boolean(ce) && hasModel;
    });
    if (ready) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

async function injectRunner(page, runnerUrl) {
  // Inject the runner. We just fetch it from the server and Function-eval it
  // in the page context so it has direct access to the Mage DOM.
  await page.evaluate(async (url) => {
    const r = await fetch(url);
    const t = await r.text();
    const f = new Function(t);
    f();
  }, runnerUrl);
}

async function autoRun({ runnerUrl }) {
  const browser = await connect();
  try {
    const page = await findOrCreateMageTab(browser);
    const ready = await waitForMageReady(page, 25000);
    if (!ready) throw new Error('Mage prompt drawer never became ready (login? rate limit?)');
    await injectRunner(page, runnerUrl);
    return { ok: true, url: page.url() };
  } finally {
    // Don't close the browser — it's the user's persistent session.
    await browser.close().catch(() => {});
  }
}

// ---------------- Server-side driver -----------------
// Drive the Mage prompt drawer ourselves via Playwright, with real CDP mouse
// events that pass Mage's anti-bot/reCAPTCHA checks. This is the *preferred*
// pilot mode: it doesn't rely on synthetic .click() inside the page (which
// Mage's reCAPTCHA Enterprise can score as bot and silently refuse).
//
// The driver iterates over a queue of {name, kind, text, videoPrompt} items,
// for each one:
//   1. Sets the contenteditable to the prompt text via execCommand
//   2. Finds the orange submit button via the same heuristic as the runner
//   3. Clicks it with page.mouse.click (real CDP MouseEvent)
//   4. Watches img/srcset mutations + perf entries for a new creation URL
//   5. Calls onResult(item, url|null) so the server can download/persist
//
// `onResult` is async; we await it before moving on.
async function driveQueue({ items, onResult, perPromptTimeoutMs = 480000, minWaitMs = 12000, betweenMs = 2500, onProgress }) {
  const browser = await connect();
  // Don't close the browser at the end — keep the user's session alive.
  let cancelled = false;
  let page = null;
  let onResponse = null;
  try {
    page = await findOrCreateMageTab(browser);
    // Reload to ensure a clean drawer state — kills any leftover overlay,
    // command palette, half-typed prompt, or stale image cache from a
    // previous batch.
    try { await page.reload({ waitUntil: 'domcontentloaded' }); } catch (_) {}
    const ready = await waitForMageReady(page, 25000);
    if (!ready) throw new Error('Mage prompt drawer never became ready');

    // The drawer comes up COLLAPSED after a fresh page load — the orange
    // "Generate" element only renders once the drawer is expanded. Find the
    // small SVG-only button at the right edge of the drawer wrapper and click
    // it to expand. Then wait for the drawer to grow (vertically) so the
    // submit element shows up below.
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const ce = document.querySelector('[class*="promptbar"] [contenteditable="true"], [contenteditable="true"]');
      if (!ce) return false;
      const drawer = ce.closest('[class*="promptbar"]') || ce.parentElement;
      const dR = drawer.getBoundingClientRect();
      // Find a small SVG-only button close to the drawer's right edge with no
      // text (the expand `↗` icon).
      const btns = Array.from(document.querySelectorAll('button'));
      const candidate = btns
        .filter((b) => !((b.textContent || '').trim()))
        .filter((b) => b.querySelector('svg'))
        .map((b) => ({ b, r: b.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0 && r.width <= 32 && r.height <= 32
          && r.top >= dR.top - 6 && r.top <= dR.bottom + 6
          && r.left >= dR.right - 60 && r.left <= dR.right + 30)
        .sort((a, b) => Math.abs(a.r.top - dR.top) - Math.abs(b.r.top - dR.top))[0];
      if (candidate) candidate.b.click();
      return !!candidate;
    });
    await page.waitForTimeout(900);

    // CRITICAL: reset the drawer to IMAGE mode. The /explore drawer keeps its
    // last state (Image vs Video tab) across reloads — if anything in this
    // session left it on Video (e.g. the Mage video API replayer), every Send
    // will spawn a video instead of an image and the cdn-image regex will
    // never match. We click the drawer's "Image" pill to be safe. This is a
    // no-op if already on Image because Mantine pill toggles are radio-style.
    //
    // We ALSO disable Fast Mode here — Fast Mode burns gems on the Pro Plus
    // tier (~60 gems / image) AND empirically yields LOWER quality than the
    // base Mango 2 model. We detect Fast=ON by the presence of a Mantine
    // Badge (gem cost indicator) inside the drawer area. If present, we click
    // the "Fast" chip to toggle it off, then re-check.
    await page.evaluate(() => {
      const ce = document.querySelector('[class*="promptbar"] [contenteditable="true"], [contenteditable="true"]');
      if (!ce) return { clicked: false, reason: 'no contenteditable' };
      const ceR = ce.getBoundingClientRect();
      // Find pairs of buttons (Image, Video) that sit on the same row,
      // adjacent in x. We then keep the pair closest to the contenteditable
      // (vertically) — that's the drawer toggle, not the feed filter.
      const btns = Array.from(document.querySelectorAll('button'));
      const imgBtns = btns.filter((b) => (b.textContent || '').trim() === 'Image').map((b) => ({ b, r: b.getBoundingClientRect() }));
      const vidBtns = btns.filter((b) => (b.textContent || '').trim() === 'Video').map((b) => ({ b, r: b.getBoundingClientRect() }));
      const pairs = [];
      for (const i of imgBtns) {
        for (const v of vidBtns) {
          if (Math.abs(i.r.top - v.r.top) < 6 && Math.abs((v.r.left) - (i.r.right)) < 80) {
            pairs.push({ img: i, vid: v, dy: Math.min(Math.abs(i.r.top - ceR.top), Math.abs(i.r.bottom - ceR.top)) });
          }
        }
      }
      if (!pairs.length) return { clicked: false, reason: 'no Image/Video pair found' };
      pairs.sort((a, b) => a.dy - b.dy);
      const drawerImg = pairs[0].img.b;
      drawerImg.click();
      return { clicked: true, x: Math.round(pairs[0].img.r.left), y: Math.round(pairs[0].img.r.top) };
    }).then((r) => console.log('[driver] image-mode reset: ' + JSON.stringify(r))).catch(() => {});
    await page.waitForTimeout(700);

    // Force the IMAGE Concept to the bare "Mango 2" (NOT "Mango 2 Fast Mode").
    // Mage stores both as distinct Concepts that share a thumbnail:
    //   • "Mango 2"            — base model, ~130s, no gems, BEST quality
    //   • "Mango 2 Fast Mode"  — speed variant, ~29s, costs ~60 gems, BLURRIER
    // The drawer's "Fast" toggle only flips a flag inside the Fast Mode
    // concept; it does NOT clear the concept itself, so previous platform
    // batches submitted with Concept="Mango 2 Fast Mode" attached and got the
    // lower-quality output. We open the model picker and click "Mango 2"
    // explicitly to make sure the bare-model Concept is the active one.
    try {
      const conceptInfo = await page.evaluate(() => {
        const vh = window.innerHeight;
        const inDrawer = (r) => r.top > vh - 220 && r.top < vh - 30;
        const badges = Array.from(document.querySelectorAll('[class*="mage-Badge"]'))
          .filter((el) => inDrawer(el.getBoundingClientRect()))
          .filter((el) => /^\s*\d+\s*$/.test((el.innerText || '').trim()));
        return { gemCostVisible: badges.length > 0 };
      });
      if (conceptInfo.gemCostVisible) {
        console.log('[driver] gem-cost badge visible → Concept is Fast Mode, switching to bare "Mango 2"');
        // Open the model picker by clicking the chip whose label starts with "Mango"
        await page.locator('button', { hasText: /^Mango/ }).first().click({ timeout: 3000 });
        await page.waitForTimeout(1500);
        // Verify picker open
        const pickerOpen = await page.evaluate(() => {
          return !!Array.from(document.querySelectorAll('div, [role="dialog"]'))
            .find((el) => /Choose Image Model|Choose Model/i.test((el.innerText || '').slice(0, 200)));
        });
        if (pickerOpen) {
          console.log('[driver] picker open — clicking bare "Mango 2" tile');
          // Click via locator filtering: must contain "Mango 2" but NOT "Fast Mode"
          // We pick the smallest matching element (the actual title <p>).
          const clicked = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('p, span, div, button'))
              .filter((el) => (el.innerText || '').trim() === 'Mango 2');
            if (!titles.length) return false;
            // Walk up to closest interactive ancestor and click
            const tile = titles[0];
            const tileR = tile.getBoundingClientRect();
            // Mantine cards capture clicks via parent .mage-Group-root or button — fire a synthetic click
            const target = tile.closest('button') || tile.closest('[role="button"]') || tile;
            target.click();
            return { x: tileR.left, y: tileR.top };
          });
          console.log('[driver] Mango 2 click result: ' + JSON.stringify(clicked));
          if (clicked) {
            // Also try a real Playwright click for robustness
            try {
              await page.getByText('Mango 2', { exact: true }).first().click({ timeout: 2500 });
            } catch (_) {}
          }
          await page.waitForTimeout(1500);
        } else {
          console.log('[driver] picker did not open — skipping concept switch');
        }
      } else {
        console.log('[driver] no gem-cost badge — Concept already bare Mango 2');
      }
    } catch (e) {
      console.log('[driver] concept switch failed: ' + e.message.split('\n')[0]);
    }

    // Seed seen URLs from current DOM/perf to avoid picking up stale ones.
    const seedUrls = await page.evaluate(() => {
      const broadRe = /https?:\/\/cdn\d*\.mage\.space\/(?:temp\/\d+d\/)?creations\/[^/]+\/image\/[^?#"'\s]+/i;
      const seen = new Set();
      document.querySelectorAll('img').forEach((img) => {
        [img.currentSrc, img.src, img.getAttribute('src') || '', img.getAttribute('srcset') || ''].forEach((s) => {
          if (s) { const m = s.match(broadRe); if (m) seen.add(m[0]); }
        });
      });
      performance.getEntriesByType('resource').forEach((e) => {
        const m = e.name.match(broadRe); if (m) seen.add(m[0]);
      });
      return Array.from(seen);
    });
    const reportedUrls = new Set(seedUrls);

    // CDP-level network capture: listen for any cdn/creations/.../image/...
    // response. This is far more reliable than MutationObserver/perf-API
    // polling inside the page (which can miss images attached via background-
    // image styles, picture/source tags, lazy hooks, etc.). We track URLs
    // observed AFTER each submit through `latestNetUrl` (string slot).
    const netImageRe = /https?:\/\/cdn\d*\.mage\.space\/(?:temp\/\d+d\/)?creations\/[^/]+\/image\/[^?#"'\s]+/i;
    let latestNetUrl = null;
    let netSubmitTime = 0;
    onResponse = (resp) => {
      try {
        const u = resp.url();
        if (!netImageRe.test(u)) return;
        if (reportedUrls.has(u)) return;
        // Only count URLs observed after the most recent submit click.
        if (Date.now() < netSubmitTime) return;
        latestNetUrl = u;
      } catch (_) {}
    };
    page.on('response', onResponse);

    for (let i = 0; i < items.length; i++) {
      if (cancelled) break;
      const it = items[i];
      if (onProgress) onProgress({ index: i, total: items.length, name: it.name, phase: 'start' });

      // 1. Set the prompt — execCommand actually does work for Mage's tiptap
      //    contenteditable (it ends up in innerText, and the orange Mango
      //    submit button reads from that). We avoid CDP keyboard typing
      //    because Ctrl+A would open Mage's command palette.
      await page.evaluate((t) => {
        const ce = document.querySelector('[class*="promptbar"] [contenteditable="true"], [contenteditable="true"]');
        if (!ce) throw new Error('contenteditable not found');
        ce.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, t);
      }, it.text);

      // Set the document.title for visibility (matches the legacy runner)
      await page.evaluate((title) => { document.title = title; }, `STUDIO_${i + 1}/${items.length}_${it.name}`);

      await page.waitForTimeout(800);

      // Snapshot URLs already on the page just before submit.
      const seenNow = await page.evaluate((reported) => {
        const broadRe = /https?:\/\/cdn\d*\.mage\.space\/(?:temp\/\d+d\/)?creations\/[^/]+\/image\/[^?#"'\s]+/i;
        const seen = new Set(reported);
        document.querySelectorAll('img').forEach((img) => {
          [img.currentSrc, img.src, img.getAttribute('src') || '', img.getAttribute('srcset') || ''].forEach((s) => {
            if (s) { const m = s.match(broadRe); if (m) seen.add(m[0]); }
          });
        });
        performance.getEntriesByType('resource').forEach((e) => {
          const m = e.name.match(broadRe); if (m) seen.add(m[0]);
        });
        return Array.from(seen);
      }, Array.from(reportedUrls));
      seenNow.forEach((u) => reportedUrls.add(u));

      // 2. Find submit element. Mage's "Generate" is a <div> (not a <button>!)
      //    sized ~32x32 with an <img> child (the orange Mango logo), positioned
      //    on the same horizontal band as the drawer's bottom edge, to the
      //    right of the Mango/Fast/Character chips.
      async function locateSubmit() {
        return page.evaluate(() => {
          const ce = document.querySelector('[class*="promptbar"] [contenteditable="true"], [contenteditable="true"]');
          if (!ce) return null;
          const drawer = ce.closest('[class*="promptbar"]') || ce.parentElement;
          const dR = drawer.getBoundingClientRect();
          const candidates = Array.from(document.querySelectorAll('div'))
            .filter((d) => d.querySelector('img'))
            .map((d) => ({ d, r: d.getBoundingClientRect() }))
            .filter(({ r }) => r.width >= 24 && r.width <= 48 && r.height >= 24 && r.height <= 48
              && r.top >= dR.bottom - 40 && r.top <= dR.bottom + 40
              && r.left > dR.left + 200);
          candidates.sort((a, b) => b.r.right - a.r.right);
          if (!candidates.length) return null;
          const c = candidates[0];
          return { x: c.r.left + c.r.width / 2, y: c.r.top + c.r.height / 2 };
        });
      }
      async function tryExpandDrawer() {
        return page.evaluate(() => {
          const ce = document.querySelector('[class*="promptbar"] [contenteditable="true"], [contenteditable="true"]');
          if (!ce) return false;
          const drawer = ce.closest('[class*="promptbar"]') || ce.parentElement;
          const dR = drawer.getBoundingClientRect();
          const btns = Array.from(document.querySelectorAll('button'));
          const candidate = btns
            .filter((b) => !((b.textContent || '').trim()))
            .filter((b) => b.querySelector('svg'))
            .map((b) => ({ b, r: b.getBoundingClientRect() }))
            .filter(({ r }) => r.width > 0 && r.height > 0 && r.width <= 32 && r.height <= 32
              && r.top >= dR.top - 6 && r.top <= dR.bottom + 6
              && r.left >= dR.right - 60 && r.left <= dR.right + 30)
            .sort((a, b) => Math.abs(a.r.top - dR.top) - Math.abs(b.r.top - dR.top))[0];
          if (candidate) candidate.b.click();
          return !!candidate;
        });
      }
      let submitBox = await locateSubmit();
      if (!submitBox) {
        // Drawer probably re-collapsed (Mage does this between generations).
        // Re-expand and retry once.
        await tryExpandDrawer();
        await page.waitForTimeout(700);
        submitBox = await locateSubmit();
      }

      if (!submitBox) {
        if (onProgress) onProgress({ index: i, total: items.length, name: it.name, phase: 'no-submit' });
        try { await onResult(it, null, 'submit button not found'); } catch (_) {}
        continue;
      }

      // 3. Real CDP mouse click
      const submitTime = Date.now();
      latestNetUrl = null;
      netSubmitTime = submitTime;
      await page.mouse.click(submitBox.x, submitBox.y);
      if (onProgress) onProgress({ index: i, total: items.length, name: it.name, phase: 'submitted' });

      // 4. Wait for new creation URL — race the in-page detector against the
      //    Playwright network capture (`latestNetUrl`). Whichever sees the new
      //    cdn/creations/.../image URL first wins.
      const inPageWait = page.evaluate(async ({ seenArr, maxMs, minMs, t0 }) => {
        const broadRe = /https?:\/\/cdn\d*\.mage\.space\/(?:temp\/\d+d\/)?creations\/[^/]+\/image\/[^?#"'\s]+/i;
        const directRe = /https?:\/\/cdn\d*\.mage\.space\/(?:temp\/\d+d\/)?creations\/[^/]+\/image\/[^?#"'\s]+/i;
        const proxyRe = /resize\.mage\.space\/[^"'\s]+/i;
        const seen = new Set(seenArr);
        function decodeProxy(u) {
          try {
            const m = u.match(/resize\.mage\.space\/[^/]*\/(?:dpr:[^/]+\/)?(?:width:[^/]+\/)?([A-Za-z0-9+/=]+)/);
            if (!m) return null;
            const dec = atob(m[1]);
            return dec.startsWith('http') ? dec : null;
          } catch (_) { return null; }
        }
        return new Promise((resolve) => {
          let observed = null;
          const submitPerf = performance.now();
          function check(url) {
            if (!url || observed) return;
            const m = url.match(broadRe);
            if (!m) return;
            const u = m[0];
            if (seen.has(u)) return;
            if (Date.now() - t0 < minMs) return;
            observed = u;
            try { mo.disconnect(); } catch (_) {}
            let final = u;
            if (!directRe.test(final) && proxyRe.test(url)) {
              const d = decodeProxy(url);
              if (d && directRe.test(d)) final = d.match(directRe)[0];
            }
            resolve(final);
          }
          const mo = new MutationObserver((muts) => {
            muts.forEach((mu) => {
              mu.addedNodes && mu.addedNodes.forEach((n) => {
                if (n.nodeType !== 1) return;
                if (n.tagName === 'IMG') { check(n.currentSrc || n.src || n.getAttribute('src') || ''); check(n.getAttribute('srcset') || ''); }
                n.querySelectorAll && n.querySelectorAll('img').forEach((img) => {
                  check(img.currentSrc || img.src || img.getAttribute('src') || '');
                  check(img.getAttribute('srcset') || '');
                });
              });
              if (mu.type === 'attributes' && mu.target && mu.target.tagName === 'IMG') {
                check(mu.target.currentSrc || mu.target.src || mu.target.getAttribute('src') || '');
                check(mu.target.getAttribute('srcset') || '');
              }
            });
          });
          mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] });
          (function poll() {
            if (observed) return;
            if (Date.now() - t0 > maxMs) { try { mo.disconnect(); } catch (_) {} return resolve(null); }
            performance.getEntriesByType('resource').forEach((e) => {
              if (e.startTime < submitPerf) return;
              const u = e.name;
              if (broadRe.test(u) || proxyRe.test(u)) check(u);
            });
            setTimeout(poll, 1500);
          })();
        });
      }, { seenArr: Array.from(reportedUrls), maxMs: perPromptTimeoutMs, minMs: minWaitMs, t0: submitTime });

      // Poller that returns whatever the response listener has captured.
      const netWait = (async () => {
        const deadline = submitTime + perPromptTimeoutMs;
        while (Date.now() < deadline) {
          if (latestNetUrl && Date.now() - submitTime >= minWaitMs) return latestNetUrl;
          await new Promise((r) => setTimeout(r, 800));
        }
        return null;
      })();

      const url = await Promise.race([inPageWait, netWait]);

      try {
        if (url) {
          reportedUrls.add(url);
          await onResult(it, url, null);
          if (onProgress) onProgress({ index: i, total: items.length, name: it.name, phase: 'ok', url });
        } else {
          await onResult(it, null, 'timeout');
          if (onProgress) onProgress({ index: i, total: items.length, name: it.name, phase: 'timeout' });
        }
      } catch (e) {
        if (onProgress) onProgress({ index: i, total: items.length, name: it.name, phase: 'result-error', error: e.message });
      }
      await page.waitForTimeout(betweenMs);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { if (page && onResponse) page.off('response', onResponse); } catch (_) {}
    await browser.close().catch(() => {});
  }
}

module.exports = { launchChrome, isCdpAlive, autoRun, driveQueue, PROFILE_DIR, CDP_PORT };
