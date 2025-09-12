// optimize-mp4-test.js (à la racine du projet)
const fs = require('fs');
const path = require('path');
const util = require('util');
const { execFile } = require('child_process');

const renameAsync = util.promisify(fs.rename);
const mkdirAsync = util.promisify(fs.mkdir);
const statAsync  = util.promisify(fs.stat);
const readdirAsync = util.promisify(fs.readdir);
const execFileAsync = util.promisify(execFile);

// 👉 CIBLE UNIQUEMENT CE DOSSIER (depuis la racine)
const targetDir = path.resolve(__dirname, 'public/images/test/test1');
const backupDir = path.resolve(__dirname, 'public/backup');

console.log(`📂 Exploration du dossier : ${targetDir}`);

(async () => {
  // Vérif dossier cible
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Erreur : Le dossier ${targetDir} n'existe pas.`);
    process.exit(1);
  }

  // Vérif/création backup
  if (!fs.existsSync(backupDir)) {
    await mkdirAsync(backupDir, { recursive: true });
    console.log(`📦 Dossier "backup" créé : ${backupDir}`);
  }

  // Vérif ffmpeg accessible
  try {
    await execFileAsync('ffmpeg', ['-version']);
  } catch {
    console.error('❌ ffmpeg introuvable. Installe-le et assure-toi qu’il est dans le PATH.');
    process.exit(1);
  }

  // Liste .mp4 (non récursif ; passe recursive=true si besoin)
  const getMp4Files = async (dir, recursive = false, list = []) => {
    const entries = await readdirAsync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      const st = await statAsync(full);
      if (st.isDirectory()) {
        if (recursive) await getMp4Files(full, recursive, list);
      } else if (/\.mp4$/i.test(entry)) {
        list.push(full);
      }
    }
    return list;
  };

  const files = await getMp4Files(targetDir, /* recursive */ false);

  if (files.length === 0) {
    console.log('❌ Aucun MP4 trouvé à optimiser dans ce dossier.');
    process.exit(0);
  }

  const moveToBackup = async (filePath) => {
    try {
      const fileName = path.basename(filePath);
      const destination = path.join(backupDir, fileName);
      await renameAsync(filePath, destination);
      console.log(`📦 Original déplacé dans backup : ${destination}`);
    } catch (err) {
      console.error(`❌ Erreur lors du déplacement vers backup : ${filePath}`, err);
    }
  };

  const processVideo = async (file) => {
    const ext = path.extname(file).toLowerCase(); // .mp4
    const dir = path.dirname(file);
    const base = path.basename(file, ext);
    const tempInput = path.join(dir, `${base}.temp${ext}`);
    const outputFile = file; // réécrit au même nom

    try {
      // Renommer l’original -> .temp.mp4
      await renameAsync(file, tempInput);

      // 🎯 Réduction pour mobile :
      // - largeur max 720 px (aspect préservé)
      // - CRF 26, preset slow, yuv420p (compat)
      // - faststart pour démarrer plus vite en streaming
      // - AAC 96 kbps (si audio)
      const args = [
        '-y',
        '-i', tempInput,
        // Vidéo
        '-c:v', 'libx264',
        '-preset', 'slow',
        '-crf', '26',
        '-vf', "scale=w=720:h=-2:flags=lanczos:force_original_aspect_ratio=decrease",
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        // Audio
        '-c:a', 'aac',
        '-b:a', '96k',
        // Sortie
        outputFile,
      ];

      await execFileAsync('ffmpeg', args);
      await moveToBackup(tempInput);
      console.log(`✅ Vidéo optimisée : ${outputFile}`);
    } catch (err) {
      console.error(`❌ Erreur sur ${file} :`, err);
      // Restaure l’original en cas d’échec
      try {
        if (fs.existsSync(tempInput) && !fs.existsSync(file)) {
          await renameAsync(tempInput, file);
          console.log(`↩️ Original restauré : ${file}`);
        }
      } catch (restoreErr) {
        console.error(`⚠️ Échec de restauration pour ${file} :`, restoreErr);
      }
    }
  };

  for (const f of files) {
    await processVideo(f);
  }

  console.log('🎉 Optimisation MP4 (dossier test) terminée.');
})();
