/* Capture the EXACT Next.js Server Action payload that Mage sends when an
   image is submitted, regardless of who triggers the click (user manually
   OR the platform driver). This lets us diff "manual" vs "platform" submits
   to find why visual quality differs.

   Usage:
     node tools/anong/capture_image_submit.js [N]

   N defaults to 2 — capture the next N submits then exit. While running,
   trigger the submits however you want (UI click, platform batch, etc.).
   For each capture, dump:
     - timestamp
     - URL + status
     - request `next-action` header (the action ID)
     - request body (parsed JSON)
     - first 200 chars of the response

   Also runs a snapshot of the drawer state JUST BEFORE EACH submit (chips,
   badges, prompt text) so we can see what the user/platform configured. */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const N = parseInt(process.argv[2] || '2', 10);
const OUT = path.join(__dirname, 'recordings', 'image_submits_' + Date.now());
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const ctx = browser.contexts()[0];
  let page = ctx.pages().find((p) => /mage\.space/.test(p.url()));
  if (!page) page = await ctx.newPage();
  await page.bringToFront();
  await sleep(500);

  let captured = 0;

  async function snapshotDrawer() {
    return page.evaluate(() => {
      const vh = window.innerHeight;
      const inDrawer = (r) => r.top > vh - 220 && r.top < vh - 30;
      const chips = Array.from(document.querySelectorAll('button'))
        .filter((b) => inDrawer(b.getBoundingClientRect()))
        .map((b) => ({
          text: (b.innerText || '').trim().slice(0, 40),
          x: Math.round(b.getBoundingClientRect().left),
          y: Math.round(b.getBoundingClientRect().top),
          ariaPressed: b.getAttribute('aria-pressed'),
          dataState: b.getAttribute('data-state'),
        }))
        .filter((c) => c.text);
      const badges = Array.from(document.querySelectorAll('[class*="mage-Badge"]'))
        .filter((el) => inDrawer(el.getBoundingClientRect()))
        .map((el) => (el.innerText || '').trim());
      const ce = document.querySelector('[contenteditable="true"]');
      const prompt = ce ? (ce.innerText || '').trim().slice(0, 400) : '';
      return { chips, badges, prompt };
    });
  }

  // Use Playwright's request listener on the page-level network. The Server
  // Action POST goes to https://www.mage.space/explore (or similar route)
  // with a `next-action` header. We log it.
  page.on('request', async (request) => {
    try {
      if (request.method() !== 'POST') return;
      const headers = request.headers();
      const action = headers['next-action'];
      if (!action) return;
      const url = request.url();
      // Filter to image submits — image-submit actions have a body that starts
      // with `[{"architectureConfig":` and contains `model_id`/`prompt` in the
      // Mango family. Video submits use the Wan22 architecture.
      const body = request.postData() || '';
      // Heuristic: if it mentions architectureConfig AND prompt AND looks like
      // an image (mango / photorealism / etc.), capture. Otherwise skip.
      if (!/architectureConfig/.test(body)) return;
      const isVideo = /wan_22|wan22|num_frames/.test(body);
      const kind = isVideo ? 'VIDEO' : 'IMAGE';
      if (kind === 'VIDEO') return; // we only care about IMAGE submits here

      const drawerSnap = await snapshotDrawer();

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = path.join(OUT, `submit_${captured + 1}_${stamp}.json`);
      let parsedBody;
      try { parsedBody = JSON.parse(body); } catch (_) { parsedBody = body; }
      const out = {
        index: captured + 1,
        kind,
        url,
        action,
        contentType: headers['content-type'],
        body: parsedBody,
        drawerSnapshot: drawerSnap,
      };
      fs.writeFileSync(file, JSON.stringify(out, null, 2));
      captured++;
      console.log(`\n[capture ${captured}/${N}] saved → ${file}`);
      console.log(`  drawer chips: ${JSON.stringify(drawerSnap.chips.map((c) => c.text))}`);
      console.log(`  badges: ${JSON.stringify(drawerSnap.badges)}`);
      console.log(`  prompt (first 100): ${drawerSnap.prompt.slice(0, 100)}…`);
      // The architectureConfig is the most interesting part. Pull it out.
      try {
        const arch = parsedBody[0]?.architectureConfig;
        if (arch) {
          console.log('  architectureConfig keys:', Object.keys(arch));
          console.log('  model_id  :', arch.model_id);
          console.log('  base_size :', arch.base_size);
          console.log('  steps     :', arch.num_inference_steps);
          console.log('  cfg       :', arch.guidance_scale);
          console.log('  aspect    :', arch.aspect_ratio);
          console.log('  prompt    :', String(arch.prompt || '').slice(0, 80) + '…');
          if (arch.prompt_filter) console.log('  filter    :', JSON.stringify(arch.prompt_filter).slice(0, 120));
        }
        const conceptId = parsedBody[0]?.conceptId;
        if (conceptId) console.log('  conceptId :', conceptId);
        const powerPack = parsedBody[0]?.activePowerPack;
        console.log('  powerPack :', JSON.stringify(powerPack));
      } catch (_) {}
      if (captured >= N) {
        console.log(`\n=== captured ${N} submits, exiting in 2s ===`);
        await sleep(2000);
        process.exit(0);
      }
    } catch (e) {
      console.log('listener error:', e.message);
    }
  });

  console.log(`Listening for the next ${N} IMAGE submits…`);
  console.log('  → Trigger them however: manual UI Generate clicks, platform batch, whatever.');
  console.log(`  → Files will be written to ${OUT}\n`);

  // Keep alive
  await new Promise(() => {});
})();
