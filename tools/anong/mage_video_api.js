/*
  mage_video_api.js — direct API replayer for Mage's video generation server
  actions, using cookies + JWT from the dedicated logged-in Chrome via CDP.

  The 3 server actions we replay (action IDs captured 2026-05-06; if they
  rotate on a Mage deploy, re-run mage_video_drive.js to capture fresh ones
  and update the constants below).

    Upload image  → ACTION_UPLOAD_IMAGE
    Submit video  → ACTION_SUBMIT_VIDEO
    Poll history  → ACTION_GET_HISTORY

  Public API:
    require('./mage_video_api').generateVideo({ imagePath, prompt }) → mp4 buffer
*/

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const CDP_URL = 'http://127.0.0.1:9222';
const MAGE_URL = 'https://www.mage.space/explore';

const ACTION_UPLOAD_IMAGE = '60504e32c82efd78691ca44fe403127904130c7507';
const ACTION_SUBMIT_VIDEO = '407876bb74f87cb9f48cb11a92568bd2125638b2c0';
const ACTION_GET_HISTORY  = '40c81c37d71fda7bc79e7ad8087d8ed13d23f941f0';

// Exposed for callers that want to override per-batch.
//
// Mage exposes "Concepts" (UI presets) that wrap a real model + a prompt
// filter. The "Wan Video 2.2 Fast" Concept the user prefers is wired to:
//   model_id   : 'wan22-video-lightning'   (Wan 2.2 Video Lightning)
//   conceptId  : '1671da7abd264bf79b4689d1e793b5b7'  (top-level body field)
// We captured this from a real submit by driving Mage UI on 2026-05-07.
// The architectureConfig itself is identical to a raw Lightning submit; the
// difference comes from the conceptId, which Mage applies as a server-side
// pipeline tweak (better motion quality, crisper bounce). Without conceptId,
// Mage runs the bare model and motion looks blurry/flat.
const DEFAULT_VIDEO_CONFIG = {
  model_id: 'wan22-video-lightning',
  base_size: '480p',
  flow_shift: 8,
  num_frames: 81,
  architecture: 'wan_22',
  aspect_ratio: 'phone', // 9:16
  guidance_scale: 1,
  num_inference_steps: 4,
  prompt_filter: {
    id: 'e08d2e1eb87ae2b7e1cf559073235309',
    name: 'Empty',
    pack: 'Custom',
    prompt: '{prompt}',
    negative_prompt: 'default-negative-do-not-remove, {negative_prompt}',
  },
};

// Concept ID for "Wan Video 2.2 Fast" (Mage Official). Captured from the UI.
const WAN_FAST_CONCEPT_ID = '1671da7abd264bf79b4689d1e793b5b7';

// ---------- internals ----------

// Pull the user's Firebase JWT out of IndexedDB (firebase auth lib stores it
// under firebaseLocalStorageDb → firebaseLocalStorage). The page must already
// be on a Mage URL where Firebase is loaded.
async function getAuthToken(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('firebaseLocalStorageDb');
    open.onsuccess = () => {
      try {
        const db = open.result;
        const tx = db.transaction(['firebaseLocalStorage'], 'readonly');
        const store = tx.objectStore('firebaseLocalStorage');
        const req = store.getAll();
        req.onsuccess = () => {
          const entries = req.result || [];
          const u = entries.find((e) => e && e.value && e.value.stsTokenManager && e.value.stsTokenManager.accessToken);
          if (!u) return resolve(null);
          resolve(u.value.stsTokenManager.accessToken);
        };
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    };
    open.onerror = () => reject(open.error);
  }));
}

// Parse the Next.js Server Action response, which is a series of lines of the
// form `<index>:<json>`. We return them as { "0": ..., "1": ..., ... }.
function parseFlight(text) {
  const out = {};
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line) continue;
    const m = line.match(/^([0-9a-zA-Z]+):(.*)$/);
    if (!m) continue;
    const v = m[2];
    try { out[m[1]] = JSON.parse(v); } catch (_) { out[m[1]] = v; }
  }
  return out;
}

async function callAction(reqctx, actionId, body, label = 'action') {
  const r = await reqctx.post(MAGE_URL, {
    headers: {
      'next-action': actionId,
      'content-type': 'text/plain;charset=UTF-8',
      'accept': 'text/x-component',
    },
    data: JSON.stringify(body),
    timeout: 120000,
  });
  const text = await r.text();
  const parsed = parseFlight(text);
  if (r.status() >= 400) {
    throw new Error('[' + label + '] HTTP ' + r.status() + ': ' + text.slice(0, 400));
  }
  return { status: r.status(), text, parsed };
}

async function uploadImage(reqctx, imageBuffer, mime = 'image/jpeg') {
  const dataUri = 'data:' + mime + ';base64,' + imageBuffer.toString('base64');
  const { parsed } = await callAction(reqctx, ACTION_UPLOAD_IMAGE, [dataUri], 'upload');
  // Result line "1" is the CDN URL string
  const url = parsed['1'];
  if (typeof url !== 'string' || !url.startsWith('http')) {
    throw new Error('upload returned no URL: ' + JSON.stringify(parsed).slice(0, 400));
  }
  return url;
}

async function submitVideo(reqctx, { prompt, imageUrl, authToken, configOverride, onLog }) {
  const cfg = Object.assign({}, DEFAULT_VIDEO_CONFIG, configOverride || {}, {
    prompt,
    image: imageUrl,
    negative_prompt: '',
    additional_images: null,
  });
  const body = [{
    architectureConfig: cfg,
    architectureConfigToSave: '$0:0:architectureConfig',
    authToken,
    conceptId: WAN_FAST_CONCEPT_ID,
    activePowerPack: null,
  }];
  // Mage's free Pro Plus tier rate-limits video submission burst — when the
  // user hits the per-hour quota the action returns 200 with a JSON body
  // {error_code: 429}. We retry up to 5 times with exponential backoff
  // (30s → 60s → 120s → 240s → 480s → 17 min total) so a single transient
  // quota event doesn't kill an entire batch. After 5 failures we give up.
  const backoffsMs = [30000, 60000, 120000, 240000, 480000];
  const log = onLog || (() => {});
  for (let attempt = 0; ; attempt++) {
    const { parsed } = await callAction(reqctx, ACTION_SUBMIT_VIDEO, body, 'submit');
    const job = parsed['1'];
    if (job && job.history_id) return job;
    const code = job && (job.error_code || job.errorCode);
    if (code === 429 && attempt < backoffsMs.length) {
      const wait = backoffsMs[attempt];
      log('Mage rate-limited (429), backing off ' + Math.round(wait / 1000) + 's (attempt ' + (attempt + 1) + '/' + backoffsMs.length + ')');
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    throw new Error('submit returned no history_id (code=' + code + '): ' + JSON.stringify(parsed).slice(0, 400));
  }
}

async function getHistory(reqctx, historyId) {
  const { parsed } = await callAction(reqctx, ACTION_GET_HISTORY, [historyId], 'poll');
  return parsed['1'];
}

function pickVideoUrlFromHistory(h) {
  if (!h) return null;
  // Confirmed shape on 2026-05-06: result.data.video is the cdn URL.
  // Other shapes are kept as fallbacks in case Mage tweaks the format.
  const candidates = [
    h?.result?.data?.video,
    h?.result?.data?.video_url,
    h?.result?.data?.url,
    h?.result?.video,
    h?.result?.video_url,
    h?.result?.videoUrl,
    h?.result?.url,
    h?.result?.video?.url,
    h?.video_url,
    h?.videoUrl,
  ];
  for (const c of candidates) if (typeof c === 'string' && c.startsWith('http')) return c;
  if (typeof h?.result === 'string' && h.result.startsWith('http')) return h.result;
  return null;
}

// Mage's content moderation rejects some NSFW jobs and silently substitutes a
// placeholder URL like https://cdn*.mage.space/abuse-v2.mp4 (or abuse.mp4).
// We treat those as a failure so the caller can react (re-prompt, skip, or
// fall back to Fal.ai).
function isAbuseUrl(url) {
  return typeof url === 'string' && /\babuse(?:-v\d+)?\.mp4\b/i.test(url);
}

// ---------- public ----------

/**
 * Run the full Mage video pipeline for ONE image.
 * Returns the path of the saved mp4.
 *
 * @param {object} opts
 * @param {string} opts.imagePath         absolute path of the first-frame JPG
 * @param {string} opts.prompt            video prompt (English)
 * @param {string} [opts.outputPath]      where to write the mp4 (default: imagePath sibling .mp4)
 * @param {object} [opts.configOverride]  override default wan22-video-lightning config
 * @param {number} [opts.pollIntervalMs]  default 5000
 * @param {number} [opts.maxWaitMs]       default 600000 (10 min)
 * @param {function} [opts.onLog]         optional logger
 */
async function generateVideo(opts) {
  const { imagePath, prompt } = opts;
  const outputPath = opts.outputPath || imagePath.replace(/\.[a-z0-9]+$/i, '.mp4');
  const pollIntervalMs = opts.pollIntervalMs || 5000;
  const maxWaitMs = opts.maxWaitMs || 600000;
  const log = opts.onLog || ((m) => console.log('[mage] ' + m));

  if (!fs.existsSync(imagePath)) throw new Error('imagePath not found: ' + imagePath);

  const browser = await chromium.connectOverCDP(CDP_URL);
  let mp4Path;
  try {
    const ctx = browser.contexts()[0];
    if (!ctx) throw new Error('no Chrome context (start Chrome via /api/launch-chrome first)');
    let page = ctx.pages().find((p) => /mage\.space/.test(p.url()));
    if (!page) page = await ctx.newPage();
    if (!page.url().includes('mage.space')) {
      await page.goto(MAGE_URL, { waitUntil: 'domcontentloaded' });
    }

    log('grabbing Firebase JWT…');
    const authToken = await getAuthToken(page);
    if (!authToken) throw new Error('no Firebase auth token in IndexedDB — log in to Mage in the dedicated Chrome');
    log('JWT prefix: ' + authToken.slice(0, 32) + '… (length=' + authToken.length + ')');

    log('uploading image: ' + path.basename(imagePath));
    const imgUrl = await uploadImage(ctx.request, fs.readFileSync(imagePath));
    log('  → ' + imgUrl);

    log('submitting video job (model=' + DEFAULT_VIDEO_CONFIG.model_id + ', size=' + DEFAULT_VIDEO_CONFIG.base_size + ', frames=' + DEFAULT_VIDEO_CONFIG.num_frames + ')…');
    const job = await submitVideo(ctx.request, { prompt, imageUrl: imgUrl, authToken, configOverride: opts.configOverride, onLog: log });
    log('  history_id=' + job.history_id);

    const start = Date.now();
    let last = null;
    while (Date.now() - start < maxWaitMs) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      let hist;
      try { hist = await getHistory(ctx.request, job.history_id); }
      catch (e) { log('poll error (will retry): ' + e.message); continue; }
      last = hist;
      const status = hist?.status;
      const url = pickVideoUrlFromHistory(hist);
      log('  status=' + status + (url ? ' url=' + url : ''));
      if (url) {
        if (isAbuseUrl(url)) {
          throw new Error('mage moderation rejected the job (got abuse placeholder ' + url + ')');
        }
        mp4Path = await downloadTo(ctx.request, url, outputPath);
        log('  saved → ' + mp4Path);
        break;
      }
      if (status === 'failed' || status === 'cancelled' || hist?.error) {
        throw new Error('mage job ' + status + ': ' + (hist?.error || 'unknown') + ' — last=' + JSON.stringify(hist).slice(0, 400));
      }
    }
    if (!mp4Path) throw new Error('timeout waiting for video; last status: ' + JSON.stringify(last).slice(0, 400));
  } finally {
    await browser.close().catch(() => {});
  }
  return mp4Path;
}

async function downloadTo(reqctx, url, outPath) {
  const r = await reqctx.get(url, { timeout: 120000 });
  if (r.status() !== 200) throw new Error('download HTTP ' + r.status() + ' on ' + url);
  const buf = await r.body();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return outPath;
}

module.exports = { generateVideo, DEFAULT_VIDEO_CONFIG, ACTION_UPLOAD_IMAGE, ACTION_SUBMIT_VIDEO, ACTION_GET_HISTORY };

// ---------- CLI ----------
if (require.main === module) {
  (async () => {
    const args = require('minimist')(process.argv.slice(2));
    const imagePath = args.image || args._[0];
    const prompt = args.prompt || args._[1] || 'her chest bounces softly as she breathes';
    const outputPath = args.output || (imagePath && imagePath.replace(/\.[a-z0-9]+$/i, '_mage.mp4'));
    if (!imagePath) {
      console.error('usage: node mage_video_api.js --image=<path> [--prompt="..."] [--output=<mp4>]');
      process.exit(1);
    }
    try {
      const out = await generateVideo({ imagePath, prompt, outputPath });
      console.log('OK ' + out);
    } catch (e) {
      console.error('FAIL: ' + e.message);
      console.error(e.stack);
      process.exit(2);
    }
  })();
}
