const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIRS = [
  path.join(__dirname, 'public', 'images', 'megane', 'megane3'),
  path.join(__dirname, 'public', 'images', 'megane', 'megane4')
];

const IMG_MAX_WIDTH = 1080;
const IMG_QUALITY = 82;
const VIDEO_CRF = 26;
const VIDEO_MAX_HEIGHT = 1280;

async function optimizeImage(filepath) {
  const stat = fs.statSync(filepath);
  const origSize = stat.size;

  const tmpPath = filepath + '.tmp.jpg';
  await sharp(filepath)
    .resize({ width: IMG_MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: IMG_QUALITY, mozjpeg: true })
    .toFile(tmpPath);

  const newSize = fs.statSync(tmpPath).size;
  if (newSize < origSize) {
    fs.renameSync(tmpPath, filepath);
    const saved = ((1 - newSize / origSize) * 100).toFixed(0);
    console.log(`  ${path.basename(filepath)}: ${(origSize/1024).toFixed(0)}KB -> ${(newSize/1024).toFixed(0)}KB (-${saved}%)`);
    return { orig: origSize, new: newSize };
  } else {
    fs.unlinkSync(tmpPath);
    console.log(`  ${path.basename(filepath)}: already optimal (${(origSize/1024).toFixed(0)}KB)`);
    return { orig: origSize, new: origSize };
  }
}

function optimizeVideo(filepath) {
  const stat = fs.statSync(filepath);
  const origSize = stat.size;
  const tmpPath = filepath + '.tmp.mp4';

  try {
    execSync(
      `ffmpeg -i "${filepath}" -c:v libx264 -crf ${VIDEO_CRF} -preset slow -vf "scale='if(gt(ih,${VIDEO_MAX_HEIGHT}),-2,iw)':'if(gt(ih,${VIDEO_MAX_HEIGHT}),${VIDEO_MAX_HEIGHT},ih)'" -c:a aac -b:a 128k -movflags +faststart -y "${tmpPath}"`,
      { stdio: 'pipe', timeout: 120000 }
    );

    const newSize = fs.statSync(tmpPath).size;
    if (newSize < origSize) {
      fs.renameSync(tmpPath, filepath);
      const saved = ((1 - newSize / origSize) * 100).toFixed(0);
      console.log(`  ${path.basename(filepath)}: ${(origSize/1024/1024).toFixed(2)}MB -> ${(newSize/1024/1024).toFixed(2)}MB (-${saved}%)`);
      return { orig: origSize, new: newSize };
    } else {
      fs.unlinkSync(tmpPath);
      console.log(`  ${path.basename(filepath)}: already optimal (${(origSize/1024/1024).toFixed(2)}MB)`);
      return { orig: origSize, new: origSize };
    }
  } catch (e) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    console.log(`  ${path.basename(filepath)}: ERROR - ${e.message.substring(0, 100)}`);
    return { orig: origSize, new: origSize };
  }
}

async function main() {
  let totalOrig = 0, totalNew = 0;

  for (const dir of DIRS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${path.basename(dir)}`);
    console.log('='.repeat(60));

    const images = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort();
    const videos = fs.readdirSync(dir).filter(f => f.endsWith('.mp4')).sort();

    console.log(`\n--- Images (${images.length}) ---`);
    for (const img of images) {
      const r = await optimizeImage(path.join(dir, img));
      totalOrig += r.orig;
      totalNew += r.new;
    }

    console.log(`\n--- Videos (${videos.length}) ---`);
    for (const vid of videos) {
      const r = optimizeVideo(path.join(dir, vid));
      totalOrig += r.orig;
      totalNew += r.new;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOTAL: ${(totalOrig/1024/1024).toFixed(1)}MB -> ${(totalNew/1024/1024).toFixed(1)}MB`);
  console.log(`Saved: ${((totalOrig - totalNew)/1024/1024).toFixed(1)}MB (-${((1 - totalNew/totalOrig) * 100).toFixed(0)}%)`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
