const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 📁 Dossier racine
const rootDir = 'C:/Users/sflückiger/Documents/IA/public/images';

// 🔁 Récupère tous les fichiers *_animated.webp récursivement
function getAllAnimatedWebps(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllAnimatedWebps(filePath)); // 🔁 recurse
    } else if (file.endsWith('_animated.webp')) {
      results.push(filePath);
    }
  });

  return results;
}

// 🔄 Conversion WebP → GIF → MP4
function convertWebpToGifAndMp4(filePath) {
  const gifPath = filePath.replace('_animated.webp', '.gif');
  const mp4Path = filePath.replace('_animated.webp', '.mp4');
  const fileName = path.basename(filePath);

  try {
    // ✅ WebP → GIF
    execSync(`magick "${filePath}" "${gifPath}"`);
    console.log(`🎞️ ${fileName} → ✅ .gif`);

    // ✅ GIF → MP4 (dimensions ajustées)
    execSync(`ffmpeg -y -i "${gifPath}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags faststart "${mp4Path}"`);
    console.log(`📽️ ${path.basename(gifPath)} → ✅ .mp4`);

    // 🧹 Supprime .gif et .webp
    fs.unlinkSync(gifPath);
    fs.unlinkSync(filePath);
    console.log(`🧹 Supprimés : ${gifPath} & ${filePath}`);
  } catch (error) {
    console.error(`❌ Erreur conversion ${fileName} → .mp4`, error.message);
  }
}

// 🚀 Lancer la conversion sur tout /images
const files = getAllAnimatedWebps(rootDir);
console.log(`🔍 ${files.length} fichiers trouvés.`);
files.forEach(convertWebpToGifAndMp4);
