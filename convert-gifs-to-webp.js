import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const IMAGE_DIR = './public/images';
const TARGET_WIDTH = 450;

// Lister tous les GIFs
function getAllGifs(dirPath, gifs = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (let entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      getAllGifs(fullPath, gifs);
    } else if (entry.isFile() && fullPath.toLowerCase().endsWith('.gif')) {
      gifs.push(fullPath);
    }
  }

  return gifs;
}

// Conversion + ajout de suffixe + suppression du GIF
async function convertGifToWebp(gifPath) {
  const dir = path.dirname(gifPath);
  const baseName = path.basename(gifPath, '.gif');
  const webpPath = path.join(dir, `${baseName}_animated.webp`);

  try {
    await sharp(gifPath, { animated: true })
      .resize({ width: TARGET_WIDTH })
      .webp({ quality: 80, effort: 4, lossless: false, animated: true })
      .toFile(webpPath);

    console.log(`✅ Converti : ${gifPath} → ${webpPath}`);

    fs.unlinkSync(gifPath);
    console.log(`🗑️ Supprimé : ${gifPath}`);
  } catch (err) {
    console.error(`❌ Échec conversion : ${gifPath}`, err.message);
  }
}

// Lancer
async function processAllGifs() {
  const gifs = getAllGifs(IMAGE_DIR);
  console.log(`🔍 ${gifs.length} GIF(s) trouvé(s).`);

  for (let gifPath of gifs) {
    await convertGifToWebp(gifPath);
  }

  console.log("✅ Conversion + suppression terminée !");
}

processAllGifs();
