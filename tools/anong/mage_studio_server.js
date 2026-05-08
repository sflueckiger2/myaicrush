#!/usr/bin/env node
/*
  Mage Studio — local platform for batch image+video generation via Mage.space.

  How it works:
    - You run this server on http://localhost:5005.
    - You open Mage.space in your normal Chrome (already logged in).
    - You open http://localhost:5005 in another tab → control panel.
    - You pick a character/batch (e.g. "Anong batch 4") and click START.
    - The control panel gives you a one-line bookmarklet to paste in Mage's
      console. The bookmarklet:
        * fetches the queue of prompts from this server
        * for each prompt: types it into the contenteditable, clicks the
          orange Generate button (or sends Enter), waits for the new CDN URL,
          POSTs it back to the server.
    - The server, on each result:
        * downloads the image to public/images/<char>/<char>_temp/
        * sorts SFW → <char>3/, NSFW → <char>4/
        * once batch is fully complete, runs sharp optimize and the matching
          fal.ai video generation script.

  Run:   node tools/anong/mage_studio_server.js
*/

const http = require('http');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { spawn } = require('child_process');
const { buildPromptsForGenetics } = require('./template_prompts');
const cdp = require('./mage_cdp');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 5005;
const UI_PATH = path.join(__dirname, 'mage_studio_ui.html');
const RUNNER_PATH = path.join(__dirname, 'mage_studio_runner.js');
const PROMPTS_DIR = path.join(__dirname);

// ---------- character/batch registry ----------
// Each batch produces a queue of prompts, each prompt has {name, kind, text, videoPrompt}.
function loadBatch(name) {
  const file = path.join(PROMPTS_DIR, name + '.json');
  if (!fs.existsSync(file)) return null;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Accept two shapes: either {prompts:[{name,kind,prompt,videoPrompt}], genetics, styleSuffix} or {items:[...]}.
  const items = (raw.prompts || raw.items || []).map((p) => ({
    name: p.name,
    kind: p.kind,
    text: (p.prompt || p.text || '').replace('{GENETICS}', raw.genetics || '').replace('{STYLE}', raw.styleSuffix || ''),
    videoPrompt: p.videoPrompt,
  }));
  return { name, character: raw.character || guessCharacter(name), items };
}

function guessCharacter(name) {
  const m = name.match(/^([a-z]+)/i);
  return m ? m[1].toLowerCase() : 'unknown';
}

// ---------- in-memory state ----------
const state = {
  batchName: null,
  character: null,
  queue: [], // [{name, kind, text, videoPrompt}]
  results: {}, // name -> {ok, url, file, kind, videoPrompt, error?}
  videoStarted: false,
  videoQuality: 'free', // default to free Mage WAN 2.2 — paying Fal is opt-in
  // Live video-generation progress (parsed from gen_videos_generic.js stdout)
  videoProgress: {
    phase: 'idle', // 'idle' | 'optimizing' | 'generating' | 'done' | 'error'
    total: 0,
    done: 0,
    failed: 0,
    currentName: null,
    currentIndex: 0,
    lastLine: '',
    log: [], // last N lines for debugging
    startedAt: null,
    finishedAt: null,
  },
  driverActive: false, // a CDP driveQueue is currently running
  activeIndex: -1, // index in state.queue currently being processed
  activePhase: null, // 'start' | 'submitted' | 'no-submit' | 'ok' | 'fail'
  lastDriverError: null,
};

// Maps a UI "quality" choice to either a Fal model pair (sfw/nsfw) or to
// the Mage Server-Action provider (provider:'mage', no model slugs).
//   - free:    Mage wan22-video-lightning, free under Pro Plus
//   - standard:Fal WAN 2.1 i2v 480p (~$0.20/vid)
//   - eco:     Fal LTX v0.95 SFW (~$0.04) + WAN NSFW (~$0.20)
//   - premium: Fal Kling Pro 1.6 (~$0.475)
//   - none:    skip videos
const VIDEO_MODELS_BY_QUALITY = {
  free:     { provider: 'mage' },
  standard: { provider: 'fal', sfw: 'fal-ai/wan-i2v', nsfw: 'fal-ai/wan-i2v' },
  eco:      { provider: 'fal', sfw: 'fal-ai/ltx-video-v095/image-to-video', nsfw: 'fal-ai/wan-i2v' },
  premium:  { provider: 'fal', sfw: 'fal-ai/kling-video/v1.6/pro/image-to-video', nsfw: 'fal-ai/wan-i2v' },
  none:     { provider: 'none' },
};

function batchPaths(character) {
  const base = path.join(ROOT, 'public', 'images', character);
  return {
    base,
    temp: path.join(base, character + '_temp'),
    sfw: path.join(base, character + '3'),
    nsfw: path.join(base, character + '4'),
  };
}

async function ensureDirs(character) {
  const p = batchPaths(character);
  await fsp.mkdir(p.temp, { recursive: true });
  await fsp.mkdir(p.sfw, { recursive: true });
  await fsp.mkdir(p.nsfw, { recursive: true });
  return p;
}

// Scan an existing character directory and return the next free numeric index
// for either dressed/coquin so that successive batches don't overwrite earlier
// generations. Looks at both image and video filenames.
async function nextStartIndex(character) {
  const p = batchPaths(character);
  const re = {
    dressed: new RegExp('^' + character + '_dressed(?:_video)?_(\\d+)\\.(?:jpg|jpeg|png|mp4)$', 'i'),
    coquin: new RegExp('^' + character + '_coquin(?:_video)?_(\\d+)\\.(?:jpg|jpeg|png|mp4)$', 'i'),
  };
  async function maxFor(kind) {
    const dir = kind === 'dressed' ? p.sfw : p.nsfw;
    let max = 9; // historical batches start at 10, so default "next" is 10
    try {
      const files = await fsp.readdir(dir);
      for (const f of files) {
        const m = f.match(re[kind]);
        if (m) {
          const n = parseInt(m[1], 10);
          if (Number.isFinite(n) && n > max) max = n;
        }
      }
    } catch (_) { /* dir may not exist yet */ }
    return max + 1;
  }
  return { dressedStart: await maxFor('dressed'), coquinStart: await maxFor('coquin') };
}

// ---------- handlers ----------
async function downloadTo(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
  const buf = Buffer.from(await res.arrayBuffer());
  await fsp.writeFile(outPath, buf);
}

async function handleResult(item, url) {
  const character = state.character;
  const paths = await ensureDirs(character);
  const tempFile = path.join(paths.temp, item.name + '.jpg');
  // Mage CDN URLs are sometimes captured without scheme (e.g. as
  // `mage.space/temp/30d/creations/.../image/<hash>.jpg`). Prefix the cdn
  // host so fetch() accepts it.
  let fullUrl = url;
  if (!/^https?:/i.test(fullUrl)) {
    fullUrl = 'https://cdn.' + fullUrl.replace(/^\/+/, '');
  }
  await downloadTo(fullUrl, tempFile);
  const dir = item.kind === 'nsfw' ? paths.nsfw : paths.sfw;
  const finalFile = path.join(dir, item.name + '.jpg');
  await fsp.copyFile(tempFile, finalFile);
  state.results[item.name] = {
    ok: true,
    url,
    kind: item.kind,
    file: path.relative(ROOT, finalFile).replace(/\\/g, '/'),
    videoPrompt: item.videoPrompt,
  };
  await writeManifest();
  console.log('[result] ' + item.name + ' -> ' + finalFile);
  if (allDone() && !state.videoStarted) {
    state.videoStarted = true;
    runOptimize().then(() => runVideos());
  }
}

function allDone() {
  return state.queue.length > 0 && state.queue.every((it) => state.results[it.name]);
}

async function writeManifest() {
  const out = {
    batch: state.batchName,
    character: state.character,
    createdAt: new Date().toISOString(),
    items: state.queue.map((it) => {
      const r = state.results[it.name] || {};
      return { name: it.name, kind: it.kind, ok: !!r.ok, url: r.url || null, file: r.file || null, videoPrompt: it.videoPrompt };
    }),
  };
  const file = path.join(PROMPTS_DIR, (state.batchName || 'batch') + '_results.json');
  await fsp.writeFile(file, JSON.stringify(out, null, 2));
}

function runChild(cmd, args, label, extraEnv, onLine) {
  return new Promise((resolve) => {
    console.log('[' + label + '] starting: ' + cmd + ' ' + args.join(' '));
    const env = Object.assign({}, process.env, extraEnv || {});
    // If the caller wants to observe stdout/stderr line-by-line (to drive
    // live progress in the UI), pipe both streams. Otherwise inherit so
    // logs land in the same place they always did.
    const stdio = onLine ? ['ignore', 'pipe', 'pipe'] : 'inherit';
    const p = spawn(cmd, args, { cwd: ROOT, stdio, shell: process.platform === 'win32', env });
    if (onLine) {
      const pipe = (stream) => {
        let buf = '';
        stream.setEncoding('utf8');
        stream.on('data', (chunk) => {
          buf += chunk;
          let i;
          while ((i = buf.indexOf('\n')) !== -1) {
            const line = buf.slice(0, i).replace(/\r$/, '');
            buf = buf.slice(i + 1);
            try { onLine(line); } catch (_) {}
            console.log('[' + label + '] ' + line);
          }
        });
      };
      pipe(p.stdout); pipe(p.stderr);
    }
    p.on('exit', (code) => {
      console.log('[' + label + '] exit code', code);
      resolve(code === 0);
    });
  });
}

// Parser for video child-process stdout. Matches the per-line patterns emitted
// by gen_videos_generic.js so the studio UI can show live progress without
// the user having to read the terminal.
function parseVideoLine(line) {
  const vp = state.videoProgress;
  vp.lastLine = line;
  vp.log.push(line);
  if (vp.log.length > 60) vp.log = vp.log.slice(-60);
  // "anong_auto_…: 24 videos via provider=mage"  (= total count from generator)
  let m = line.match(/^\S+:\s+(\d+)\s+videos?\s+via\s+provider=/i);
  if (m) {
    vp.total = parseInt(m[1], 10);
    vp.done = 0;
    vp.failed = 0;
    vp.phase = 'generating';
    vp.startedAt = vp.startedAt || Date.now();
    return;
  }
  // "[3/24 anong_dressed_75_video.mp4@mage] starting Mage wan22-video-fast…"
  m = line.match(/^\[(\d+)\/(\d+)\s+([^@\]]+?)(?:@\w+)?\]/);
  if (m) {
    vp.currentIndex = parseInt(m[1], 10);
    if (!vp.total) vp.total = parseInt(m[2], 10);
    vp.currentName = m[3].replace(/\.mp4$/i, '');
    if (/\bDONE\b/.test(line))   { vp.done++; vp.currentName = null; }
    if (/\bSKIP\b/.test(line))   { vp.done++; vp.currentName = null; }
    if (/\bERR\b|\bFAILED\b/.test(line)) { vp.failed++; vp.currentName = null; }
    return;
  }
  // "=== 22/24 OK ==="  (final summary)
  m = line.match(/^===\s+(\d+)\/(\d+)\s+OK\s+===/);
  if (m) {
    vp.done = parseInt(m[1], 10);
    vp.failed = parseInt(m[2], 10) - vp.done;
    vp.phase = 'done';
    vp.currentName = null;
    vp.finishedAt = Date.now();
    return;
  }
  // optimizer phase markers
  if (/^=== IMAGE OPTIMIZATION/i.test(line)) { vp.phase = 'optimizing-images'; return; }
  if (/^=== VIDEO OPTIMIZATION/i.test(line)) { vp.phase = 'optimizing-videos'; return; }
  if (/^=== DONE ===/i.test(line) && vp.phase.startsWith('optimizing')) {
    // optimizer just finished — videos will start next, parser flips phase
    // when generator prints its own "via provider=" header
    vp.phase = 'idle';
  }
}

async function runOptimize() {
  state.videoProgress.phase = 'optimizing-images';
  state.videoProgress.startedAt = Date.now();
  const character = state.character || 'anong';
  const specific = path.join(ROOT, `optimize_${character}.js`);
  const onLine = (line) => parseVideoLine(line);
  if (fs.existsSync(specific)) {
    return runChild('node', [specific], 'optimize', null, onLine);
  }
  const generic = path.join(ROOT, 'optimize_generic.js');
  if (!fs.existsSync(generic)) {
    console.log('[optimize] no optimizer script found');
    return false;
  }
  return runChild('node', [generic, character], 'optimize', null, onLine);
}

async function runVideos() {
  // Honour the user's video-quality choice. "none" means: skip videos.
  const quality = state.videoQuality || 'free';
  const cfg = VIDEO_MODELS_BY_QUALITY[quality] || VIDEO_MODELS_BY_QUALITY.free;
  if (cfg.provider === 'none') {
    console.log('[videos] quality=none — skipping video generation per UI choice');
    state.videoProgress.phase = 'done';
    state.videoProgress.finishedAt = Date.now();
    return false;
  }
  const env = { VIDEO_PROVIDER: cfg.provider };
  if (cfg.provider === 'fal') {
    env.VIDEO_MODEL_SFW = cfg.sfw;
    env.VIDEO_MODEL_NSFW = cfg.nsfw;
    console.log('[videos] quality=' + quality + ' provider=fal SFW=' + cfg.sfw + ' NSFW=' + cfg.nsfw);
  } else if (cfg.provider === 'mage') {
    console.log('[videos] quality=' + quality + ' provider=mage (free under Pro Plus)');
  }
  state.videoProgress.phase = 'generating';

  const onLine = (line) => parseVideoLine(line);

  // Hand-crafted scripts only support Fal — for Mage, always use the generic.
  const m = (state.batchName || '').match(/^([a-z]+)_(.+)$/i);
  if (m && cfg.provider === 'fal') {
    const character = m[1];
    const suffix = m[2];
    const handCrafted = path.join(ROOT, `gen_${character}_videos_${suffix}.js`);
    if (fs.existsSync(handCrafted)) {
      return runChild('node', [handCrafted], 'videos', env, onLine);
    }
  }
  const generic = path.join(ROOT, 'gen_videos_generic.js');
  if (!fs.existsSync(generic)) {
    console.log('[videos] no video script available');
    state.videoProgress.phase = 'error';
    return false;
  }
  return runChild('node', [generic, state.batchName], 'videos', env, onLine);
}

// ---------- HTTP server ----------
function send(res, status, body, headers) {
  const h = Object.assign({
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  }, headers || {});
  res.writeHead(status, h);
  res.end(body);
}

function sendJson(res, status, obj) { send(res, status, JSON.stringify(obj), { 'content-type': 'application/json' }); }

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => buf += c);
    req.on('end', () => { try { resolve(JSON.parse(buf || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');
    const url = new URL(req.url, 'http://localhost:' + PORT);
    if (req.method === 'GET' && url.pathname === '/') {
      const html = await fsp.readFile(UI_PATH, 'utf8');
      return send(res, 200, html, { 'content-type': 'text/html; charset=utf-8' });
    }
    if (req.method === 'GET' && url.pathname === '/runner.js') {
      const js = await fsp.readFile(RUNNER_PATH, 'utf8');
      return send(res, 200, js, { 'content-type': 'application/javascript; charset=utf-8' });
    }
    if (req.method === 'GET' && url.pathname === '/api/batches') {
      const files = (await fsp.readdir(PROMPTS_DIR)).filter((f) => /_prompts\.json$/.test(f));
      return sendJson(res, 200, files.map((f) => f.replace('_prompts.json', '_prompts').replace(/_prompts$/, '')));
    }
    if (req.method === 'POST' && url.pathname === '/api/auto-batch') {
      // Build a fresh _prompts.json from a genetics description and (optionally)
      // start it immediately. Body: { character, genetics, styleSuffix?, batchKey?, autoStart?, count?, quality? }
      // `count` (1..50) is the number of items per category (dressed AND coquin),
      // so total prompts = 2*count. Defaults to 5 (= 10 prompts).
      // `quality` ∈ {standard, eco, premium, none} sets the SFW Fal model.
      const body = await readJson(req);
      const character = (body.character || 'unknown').toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!character) return sendJson(res, 400, { error: 'character required' });
      if (!body.genetics) return sendJson(res, 400, { error: 'genetics required' });
      const count = Math.max(1, Math.min(50, parseInt(body.count, 10) || 5));
      const quality = VIDEO_MODELS_BY_QUALITY[body.quality] ? body.quality : 'free';
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 13);
      const batchKey = (body.batchKey && body.batchKey.replace(/[^a-z0-9_]/gi, '')) || (character + '_auto_' + stamp);
      const { dressedStart, coquinStart } = await nextStartIndex(character);
      const built = buildPromptsForGenetics({
        character,
        genetics: body.genetics.trim(),
        styleSuffix: body.styleSuffix && body.styleSuffix.trim() || undefined,
        dressedStart,
        coquinStart,
        count,
      });
      const file = path.join(PROMPTS_DIR, batchKey + '_prompts.json');
      await fsp.writeFile(file, JSON.stringify(built, null, 2));
      console.log('[auto-batch] wrote ' + file + ' with ' + built.prompts.length + ' prompts (dressedStart=' + dressedStart + ' coquinStart=' + coquinStart + ')');
      let started = false;
      if (body.autoStart) {
        const batch = loadBatch(batchKey + '_prompts');
        if (batch) {
          state.batchName = batchKey;
          state.character = batch.character;
          state.queue = batch.items;
          state.results = {};
          state.videoStarted = false;
          state.videoQuality = quality;
          started = true;
          console.log('[start] ' + batchKey + ' (' + state.queue.length + ' prompts) for character ' + state.character + ' quality=' + quality);
        }
      }
      return sendJson(res, 200, { ok: true, batch: batchKey, character, count: built.prompts.length, started, quality });
    }
    if (req.method === 'POST' && url.pathname === '/api/start') {
      const body = await readJson(req);
      const batchKey = body.batch;
      const file = batchKey + '_prompts';
      const batch = loadBatch(file);
      if (!batch) return sendJson(res, 404, { error: 'batch not found: ' + batchKey });
      state.batchName = batchKey;
      state.character = batch.character;
      state.queue = batch.items;
      state.results = {};
      state.videoStarted = false;
      console.log('[start] ' + batchKey + ' (' + state.queue.length + ' prompts) for character ' + state.character);
      return sendJson(res, 200, { ok: true, batch: batchKey, character: state.character, count: state.queue.length });
    }
    if (req.method === 'GET' && url.pathname === '/api/state') {
      // For each item, compute the video output path and check whether the
      // .mp4 file exists yet (= video done). The video child writes to
      // public/images/<character>/<character>3|4/<base>_dressed_video_NN.mp4.
      const character = state.character || 'anong';
      const SFW_DIR = path.join(ROOT, 'public', 'images', character, character + '3');
      const NSFW_DIR = path.join(ROOT, 'public', 'images', character, character + '4');
      function videoStatusFor(it) {
        const dir = it.kind === 'nsfw' ? NSFW_DIR : SFW_DIR;
        const baseName = it.name
          .replace('_dressed_', '_dressed_video_')
          .replace('_coquin_', '_coquin_video_');
        const file = path.join(dir, baseName + '.mp4');
        try {
          const st = fs.statSync(file);
          if (st.size > 50000) return { status: 'done', file: path.relative(ROOT, file).replace(/\\/g, '/') };
        } catch (_) {}
        if (state.videoProgress.currentName && it.name === state.videoProgress.currentName.replace(/_video$/, '')) {
          return { status: 'running', file: null };
        }
        if (state.videoProgress.phase === 'generating' || state.videoProgress.phase === 'optimizing-images' || state.videoProgress.phase === 'optimizing-videos') {
          return { status: 'pending', file: null };
        }
        return { status: 'pending', file: null };
      }
      return sendJson(res, 200, {
        batch: state.batchName,
        character: state.character,
        total: state.queue.length,
        done: Object.values(state.results).filter((r) => r.ok).length,
        driverActive: state.driverActive,
        activePhase: state.activePhase,
        lastDriverError: state.lastDriverError,
        videoProgress: state.videoProgress,
        items: state.queue.map((it, i) => {
          const r = state.results[it.name];
          let status = 'pending';
          if (r) status = 'done';
          else if (state.driverActive && i === state.activeIndex) status = 'running';
          const v = videoStatusFor(it);
          return { name: it.name, kind: it.kind, status, url: r?.url, file: r?.file, videoStatus: v.status, videoFile: v.file };
        }),
      });
    }
    if (req.method === 'GET' && url.pathname === '/api/queue') {
      // Browser runner fetches the full queue + character.
      return sendJson(res, 200, {
        batch: state.batchName,
        character: state.character,
        items: state.queue.map((it) => ({ name: it.name, kind: it.kind, text: it.text })),
        results: state.results,
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/result') {
      const body = await readJson(req);
      const item = state.queue.find((it) => it.name === body.name);
      if (!item) return sendJson(res, 404, { error: 'unknown item ' + body.name });
      if (body.url) {
        await handleResult(item, body.url);
        return sendJson(res, 200, { ok: true });
      }
      // Don't persist failed entries — leave them as pending so a re-run picks them up.
      console.log('[result] FAILED ' + item.name + ' : ' + (body.error || 'unknown'));
      return sendJson(res, 200, { ok: false, recorded: false });
    }
    if (req.method === 'GET' && url.pathname === '/api/cdp-status') {
      const alive = await cdp.isCdpAlive();
      return sendJson(res, 200, { ok: true, alive, port: cdp.CDP_PORT, profileDir: cdp.PROFILE_DIR });
    }
    if (req.method === 'POST' && url.pathname === '/api/launch-chrome') {
      const r = await cdp.launchChrome();
      return sendJson(res, r.ok ? 200 : 500, r);
    }
    if (req.method === 'POST' && url.pathname === '/api/auto-run') {
      // Optional body: { batch?, autoBatch?: { character, genetics, styleSuffix?, batchKey?, count?, quality? } }
      // 1. If autoBatch is provided, materialise the prompts file & start that.
      // 2. Else if batch is provided (or already loaded), use it.
      // 3. Then attach to the user's Chrome via CDP and inject the runner.
      try {
        const body = await readJson(req);
        if (body.autoBatch && body.autoBatch.character && body.autoBatch.genetics) {
          const ab = body.autoBatch;
          const character = ab.character.toLowerCase().replace(/[^a-z0-9_]/g, '');
          const count = Math.max(1, Math.min(50, parseInt(ab.count, 10) || 5));
          const quality = VIDEO_MODELS_BY_QUALITY[ab.quality] ? ab.quality : 'free';
          const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 13);
          const batchKey = (ab.batchKey && ab.batchKey.replace(/[^a-z0-9_]/gi, '')) || (character + '_auto_' + stamp);
          const { dressedStart, coquinStart } = await nextStartIndex(character);
          const built = buildPromptsForGenetics({
            character,
            genetics: ab.genetics.trim(),
            styleSuffix: ab.styleSuffix && ab.styleSuffix.trim() || undefined,
            dressedStart,
            coquinStart,
            count,
          });
          await fsp.writeFile(path.join(PROMPTS_DIR, batchKey + '_prompts.json'), JSON.stringify(built, null, 2));
          const batch = loadBatch(batchKey + '_prompts');
          state.batchName = batchKey;
          state.character = batch.character;
          state.queue = batch.items;
          state.results = {};
          state.videoStarted = false;
          state.videoQuality = quality;
        } else if (body.batch) {
          const batch = loadBatch(body.batch + '_prompts');
          if (!batch) return sendJson(res, 404, { error: 'batch not found' });
          state.batchName = body.batch;
          state.character = batch.character;
          state.queue = batch.items;
          state.results = {};
          state.videoStarted = false;
          if (body.quality && VIDEO_MODELS_BY_QUALITY[body.quality]) state.videoQuality = body.quality;
        }
        if (!state.queue || !state.queue.length) {
          return sendJson(res, 400, { error: 'no batch loaded — start one first or pass batch / autoBatch' });
        }
        // Refuse a 2nd parallel run — the previous one is still working through
        // the queue. Two drivers running at once will reload the same Mage tab
        // and kill each other's evaluation contexts.
        if (state.driverActive) {
          return sendJson(res, 200, { ok: true, alreadyRunning: true, batch: state.batchName, message: 'driver already running, watch /api/state' });
        }
        // Respond immediately so the browser doesn't hold open a 20-min request.
        // The driver runs in the background and updates state.results as it goes.
        sendJson(res, 200, { ok: true, batch: state.batchName, count: state.queue.length, started: true, driver: 'cdp-server' });
        state.driverActive = true;
        state.activeIndex = -1;
        state.activePhase = null;
        state.lastDriverError = null;
        const remaining = state.queue.filter((it) => !state.results[it.name]);
        const indexByName = new Map(state.queue.map((it, i) => [it.name, i]));
        cdp.driveQueue({
          items: remaining,
          onResult: async (item, url, err) => {
            if (url) {
              try { await handleResult(item, url); } catch (e) { console.error('[result] ' + item.name + ' fail:', e.message); }
            } else {
              console.log('[driver] FAIL ' + item.name + ' : ' + (err || 'unknown'));
            }
          },
          onProgress: (p) => {
            const queueIdx = indexByName.get(p.name);
            if (queueIdx != null) state.activeIndex = queueIdx;
            state.activePhase = p.phase;
            console.log('[driver] ' + (p.index + 1) + '/' + p.total + ' ' + p.name + ' -> ' + p.phase + (p.url ? ' (' + p.url + ')' : ''));
          },
        }).then((r) => {
          console.log('[driver] done', r);
          if (r && r.ok === false) state.lastDriverError = r.error || 'driver failed';
        }).catch((e) => {
          console.error('[driver] crashed', e.message);
          state.lastDriverError = e.message;
        }).finally(() => {
          state.driverActive = false;
          state.activeIndex = -1;
          state.activePhase = null;
        });
        return;
      } catch (e) {
        console.error('[auto-run] error:', e.message);
        return sendJson(res, 500, { ok: false, error: e.message });
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/run-videos') {
      // Manually trigger video generation if some images came in earlier.
      if (state.videoStarted) return sendJson(res, 200, { ok: true, alreadyStarted: true });
      state.videoStarted = true;
      runOptimize().then(() => runVideos());
      return sendJson(res, 200, { ok: true, started: true });
    }
    send(res, 404, 'not found');
  } catch (e) {
    console.error('[err]', e);
    sendJson(res, 500, { error: e.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Mage Studio server on http://localhost:' + PORT);
  console.log('Open this URL in your browser to start a batch.');
});
