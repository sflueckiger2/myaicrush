/* Recapture v2: drives the new Mage UI to trigger upload + submit, then
   waits long enough to catch the history-poll action when Mage's React
   client polls the result. */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CDP_URL = 'http://127.0.0.1:9222';
const MAGE_URL = 'https://www.mage.space/explore';
const TEST_IMG = path.resolve(__dirname, '..', '..', 'public', 'images', 'anong', 'anong3', 'anong_dressed_116.jpg');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  let page = ctx.pages().find((p) => /mage\.space/.test(p.url()));
  if (!page) page = await ctx.newPage();
  await page.bringToFront();
  await page.goto(MAGE_URL, { waitUntil: 'domcontentloaded' });
  await sleep(2500);

  const captured = { upload: null, submit: null, history: null };
  const recent = [];

  page.on('request', (request) => {
    if (request.method() !== 'POST') return;
    const action = request.headers()['next-action'];
    if (!action) return;
    const body = request.postData() || '';
    let bodyKind = 'other';
    let preview = body.slice(0, 80).replace(/\s+/g, ' ');
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        if (typeof first === 'string') {
          if (first.startsWith('data:image/')) bodyKind = 'UPLOAD';
          else if (first.length >= 30 && first.length <= 40 && /^[a-f0-9-]+$/i.test(first)) bodyKind = 'HISTORY_ID';
        } else if (first && typeof first === 'object') {
          if (first.architectureConfig && /wan/i.test(first.architectureConfig.architecture || '')) bodyKind = 'SUBMIT_VIDEO';
        }
      }
    } catch (_) {}
    recent.push({ kind: bodyKind, action, preview });
    if (recent.length > 30) recent.shift();
    console.log(`[${bodyKind}] action=${action}  body~ ${preview}`);
    if (bodyKind === 'UPLOAD'      && !captured.upload)  captured.upload  = action;
    if (bodyKind === 'SUBMIT_VIDEO' && !captured.submit) captured.submit  = action;
    if (bodyKind === 'HISTORY_ID'  && !captured.history) captured.history = action;
  });

  console.log('--- driving the Mage UI ---');

  // Step 0: switch drawer to Video mode
  await page.evaluate(() => {
    const vh = window.innerHeight;
    const inDrawer = (r) => r.top > vh - 280 && r.top < vh - 30;
    const btn = Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === 'Video' && inDrawer(b.getBoundingClientRect()));
    if (btn) btn.click();
  });
  await sleep(1500);
  console.log('1. switched to Video mode');

  // Step 1: click the +First Frame DIV at the captured coords (~225,439)
  await page.mouse.move(225, 439);
  await sleep(150);
  await page.mouse.click(225, 439);
  await sleep(1500);
  console.log('2. clicked +First Frame');

  // Step 2: setInputFiles on the file input that just appeared
  let attached = false;
  for (let pass = 0; pass < 4; pass++) {
    const inputs = await page.locator('input[type="file"]').all();
    console.log('   inputs visible: ' + inputs.length);
    for (let i = 0; i < inputs.length; i++) {
      try {
        await inputs[i].setInputFiles(TEST_IMG, { timeout: 3000 });
        attached = true;
        console.log('   attached on input #' + i);
        break;
      } catch (e) {
        console.log('   setInputFiles failed on #' + i + ': ' + e.message.split('\n')[0]);
      }
    }
    if (attached) break;
    await sleep(800);
  }
  if (!attached) console.log('   ⚠ no file input — proceeding without first-frame');
  await sleep(2500);

  // Step 3: type a tiny prompt
  await page.evaluate(() => {
    const ce = document.querySelector('[contenteditable="true"]');
    if (!ce) return;
    ce.focus();
    document.execCommand('selectAll');
    document.execCommand('insertText', false, 'The woman bounces her breasts.');
  });
  await sleep(800);
  console.log('3. prompt set');

  // Step 4: click the Send / Generate button — locate img[alt="Send"] or the
  //         floating round button at the right edge of the drawer.
  let submitted = false;
  try {
    const sendXY = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Send"]');
      if (img) {
        const btn = img.closest('button') || img.parentElement;
        const r = btn.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }
      const vh = window.innerHeight, vw = window.innerWidth;
      const btn = Array.from(document.querySelectorAll('button')).find((b) => {
        const r = b.getBoundingClientRect();
        return r.top > vh - 200 && r.left > vw - 200 && r.width >= 30 && r.width <= 70 && b.querySelector('svg');
      });
      if (btn) { const r = btn.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }
      return null;
    });
    if (sendXY) {
      await page.mouse.click(sendXY.x, sendXY.y);
      submitted = true;
      console.log('4. clicked Send @' + sendXY.x + ',' + sendXY.y);
    } else {
      console.log('4. ⚠ no Send button found');
    }
  } catch (e) {
    console.log('4. ⚠ Send click failed: ' + e.message);
  }

  // Step 5: wait for upload + submit + a couple of polls (~60s should be plenty)
  console.log('5. waiting 90s for upload + submit + poll…');
  const start = Date.now();
  while (Date.now() - start < 90000) {
    await sleep(500);
    if (captured.upload && captured.submit && captured.history) break;
  }

  console.log('\n=== CAPTURED ===');
  console.log('UPLOAD  :', captured.upload  || '(MISSING)');
  console.log('SUBMIT  :', captured.submit  || '(MISSING)');
  console.log('HISTORY :', captured.history || '(MISSING)');

  if (!captured.upload || !captured.submit || !captured.history) {
    console.log('\nrecent actions seen:');
    recent.slice(-15).forEach((r) => console.log('  [' + r.kind + '] ' + r.action + '  body~ ' + r.preview));
  }

  const outFile = path.join(__dirname, 'recordings', 'video_actions_v2_' + Date.now() + '.json');
  fs.writeFileSync(outFile, JSON.stringify({ captured, recent }, null, 2));
  console.log('\nsaved → ' + outFile);
  process.exit(0);
})();
