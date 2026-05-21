// Quick probe: walk every public/images/<girl>/<girl>3/ folder and report
// which files would be accepted/rejected by the portrait ratio gate used
// in app.js. Useful to spot-check the MP4 dimension parser without going
// through the HTTP endpoint.

const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

const STORY_RATIO_MIN = 1.45;
const STORY_RATIO_MAX = 2.05;

async function readMp4Dimensions(absPath) {
  let fd;
  try {
    fd = await fs.open(absPath, 'r');
    const buf = Buffer.alloc(1024 * 1024);
    const { bytesRead } = await fd.read(buf, 0, buf.length, 0);
    for (let i = 0; i < bytesRead - 16; i++) {
      if (buf[i] === 0x74 && buf[i + 1] === 0x6b && buf[i + 2] === 0x68 && buf[i + 3] === 0x64) {
        const boxStart = i - 4;
        if (boxStart < 0) continue;
        const boxSize = buf.readUInt32BE(boxStart);
        if (boxSize < 84 || boxStart + boxSize > bytesRead) continue;
        const w = buf.readUInt32BE(boxStart + boxSize - 8) / 65536;
        const h = buf.readUInt32BE(boxStart + boxSize - 4) / 65536;
        if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
      }
    }
  } catch (_) {
    return null;
  } finally {
    if (fd) try { await fd.close(); } catch (_) {}
  }
  return null;
}

async function getDims(absPath) {
  if (/\.(mp4|webm|mov)$/i.test(absPath)) return readMp4Dimensions(absPath);
  if (/\.(webp|jpg|jpeg|png|gif)$/i.test(absPath)) {
    try { const m = await sharp(absPath).metadata(); return { width: m.width, height: m.height }; }
    catch { return null; }
  }
  return null;
}

(async () => {
  const root = path.join(__dirname, '..', 'public', 'images');
  const girls = (await fs.readdir(root, { withFileTypes: true }))
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const stats = { accept: 0, reject: 0, unknown: 0 };
  const rejected = [];

  for (const girl of girls) {
    const sub = path.join(root, girl, `${girl}3`);
    let files = [];
    try { files = await fs.readdir(sub); } catch { continue; }
    for (const f of files) {
      if (!/\.(webp|jpg|jpeg|png|gif|mp4|webm|mov)$/i.test(f)) continue;
      const abs = path.join(sub, f);
      const d = await getDims(abs);
      if (!d) { stats.unknown++; continue; }
      const ratio = d.height / d.width;
      const ok = ratio >= STORY_RATIO_MIN && ratio <= STORY_RATIO_MAX;
      if (ok) stats.accept++;
      else { stats.reject++; rejected.push({ file: `${girl}/${girl}3/${f}`, w: d.width, h: d.height, r: ratio.toFixed(2) }); }
    }
  }

  console.log('Stats:', stats);
  console.log('\nSample rejected (first 25):');
  rejected.slice(0, 25).forEach(r => console.log(`  ${r.r}x  ${r.w}x${r.h}  ${r.file}`));
  console.log(`\nTotal rejected: ${rejected.length}`);
})();
