// Script to check that every photo / introVideo / backgroundPhoto URL referenced
// in characters.json is reachable on the production CDN (img.myaicrush.ai).
// Prints a per-character report and a summary of broken URLs.

const fs = require('fs');
const path = require('path');
const https = require('https');

const CDN_BASE = 'https://img.myaicrush.ai/';
const CHARACTERS = require(path.join(__dirname, '..', 'characters.json'));

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 15000 }, (res) => {
      // Some CDNs do not allow HEAD: treat 405/403 as "ok" if status is < 400
      resolve({ url, status: res.statusCode });
    });
    req.on('error', (e) => resolve({ url, status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ url, status: 0, error: 'timeout' }); });
    req.end();
  });
}

(async () => {
  const tasks = [];
  for (const c of CHARACTERS) {
    for (const k of ['photo', 'introVideo', 'backgroundPhoto']) {
      if (!c[k]) continue;
      const url = CDN_BASE + String(c[k]).replace(/^\/+/, '');
      tasks.push({ name: c.name, kind: k, url });
    }
  }

  const results = [];
  // batch 8 to avoid throttling
  const batchSize = 8;
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const out = await Promise.all(batch.map(t => head(t.url).then(r => ({ ...t, ...r }))));
    results.push(...out);
    process.stdout.write(`\r  checked ${results.length}/${tasks.length}`);
  }
  process.stdout.write('\n');

  const broken = results.filter(r => !r.status || r.status >= 400);
  const ok = results.filter(r => r.status && r.status < 400);

  console.log(`\nOK: ${ok.length} / Broken: ${broken.length}`);
  if (broken.length) {
    console.log('\n--- Broken URLs ---');
    for (const b of broken) {
      console.log(`[${b.name}] (${b.kind}) ${b.status || 'ERR'} ${b.error || ''}\n  ${b.url}`);
    }
    // Group broken by character so we know which need a fix
    const byChar = {};
    for (const b of broken) {
      if (!byChar[b.name]) byChar[b.name] = [];
      byChar[b.name].push(b.kind);
    }
    console.log('\n--- Characters with at least one broken slider field ---');
    for (const [name, kinds] of Object.entries(byChar)) {
      console.log(`  ${name}: ${kinds.join(', ')}`);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'slider_check_results.json'), JSON.stringify({ ok, broken }, null, 2));
})();
