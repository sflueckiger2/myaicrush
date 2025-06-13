const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 📁 Dossier de départ
const targetDir = 'C:/Users/sflückiger/Documents/IA/public/images/lea';

// 🔁 Récupère tous les fichiers MP4 récursivement
function getAllMp4Files(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllMp4Files(filePath));
    } else if (file.endsWith('.mp4')) {
      results.push(filePath);
    }
  });

  return results;
}

// 🔄 Reconvertir en MP4 iOS-friendly
function reconvertMp4ForIOS(filePath) {
  const tempPath = filePath.replace('.mp4', '_reencoded.mp4');
  const fileName = path.basename(filePath);

  try {
    execSync(`ffmpeg -y -i "${filePath}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags faststart -an "${tempPath}"`);
    fs.renameSync(tempPath, filePath);
    console.log(`✅ Re-encodé pour iOS : ${fileName}`);
  } catch (error) {
    console.error(`❌ Erreur sur ${fileName}`, error.message);
  }
}

// 🚀 Lancer le traitement
const files = getAllMp4Files(targetDir);
console.log(`🎯 ${files.length} fichiers .mp4 trouvés dans /lea`);
files.forEach(reconvertMp4ForIOS);
