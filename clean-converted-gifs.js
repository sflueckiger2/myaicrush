import fs from 'fs';
import path from 'path';

const IMAGE_DIR = './public/images';

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

function cleanGifs() {
  const gifs = getAllGifs(IMAGE_DIR);
  let deletedCount = 0;

  for (let gifPath of gifs) {
    const webpPath = gifPath.replace(/\.gif$/i, '_animated.webp');

    if (fs.existsSync(webpPath)) {
      try {
        fs.unlinkSync(gifPath);
        console.log(`🗑️ Supprimé : ${gifPath}`);
        deletedCount++;
      } catch (err) {
        console.error(`❌ Impossible de supprimer : ${gifPath}`, err.message);
      }
    }
  }

  console.log(`✅ Nettoyage terminé : ${deletedCount} GIF(s) supprimé(s).`);
}

cleanGifs();
