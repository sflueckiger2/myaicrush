// optimize-mp4-all.js (durci & audio optionnelle).
const fs = require('fs');
const path = require('path');
const util = require('util');
const { execFile } = require('child_process');

const renameAsync    = util.promisify(fs.rename);
const mkdirAsync     = util.promisify(fs.mkdir);
const statAsync      = util.promisify(fs.stat);
const readdirAsync   = util.promisify(fs.readdir);
const execFileAsync  = util.promisify(execFile);

const ffmpegPath = 'C:\\ffmpeg-8.0-essentials_build\\ffmpeg-8.0-essentials_build\\bin\\ffmpeg.exe';

const targetDir = path.resolve(__dirname, 'public/images');
const backupDir = path.resolve(__dirname, 'public/backup');

console.log(`📂 Exploration du dossier : ${targetDir}`);

(async () => {
  if (!fs.existsSync(ffmpegPath)) {
    console.error(`❌ ffmpeg introuvable à : ${ffmpegPath}`); process.exit(1);
  }
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Dossier manquant : ${targetDir}`); process.exit(1);
  }
  if (!fs.existsSync(backupDir)) {
    await mkdirAsync(backupDir, { recursive: true });
    console.log(`📦 Dossier "backup" créé : ${backupDir}`);
  }
  await execFileAsync(ffmpegPath, ['-version']).catch(() => {
    console.error('❌ ffmpeg non exécutable.'); process.exit(1);
  });

  const getMp4Files = async (dir, list = []) => {
    const entries = await readdirAsync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (path.resolve(full).startsWith(path.resolve(backupDir))) continue;
      const st = await statAsync(full);
      if (st.isDirectory()) {
        await getMp4Files(full, list);
      } else if (/\.mp4$/i.test(entry) && !/\.temp\.mp4$/i.test(entry)) {
        list.push(full);
      }
    }
    return list;
  };

  const files = await getMp4Files(targetDir);
  if (!files.length) { console.log('❌ Aucun MP4 trouvé.'); return; }

  const moveToBackup = async (originalTempPath, originalPath) => {
    const rel = path.relative(targetDir, originalPath);
    const dest = path.join(backupDir, rel);
    await mkdirAsync(path.dirname(dest), { recursive: true });
    await renameAsync(originalTempPath, dest);
    console.log(`📦 Original sauvegardé : ${dest}`);
  };

  const safeUnlink = (p) => { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {} };

  const processVideo = async (file) => {
    const ext = path.extname(file).toLowerCase();
    const dir = path.dirname(file);
    const base = path.basename(file, ext);
    const tempInput = path.join(dir, `${base}.temp${ext}`);
    const outputFile = file;

    // Skip si déjà optimisé (original en backup)
    const rel = path.relative(targetDir, file);
    const backupCandidate = path.join(backupDir, rel);
    if (fs.existsSync(backupCandidate)) {
      console.log(`⏩ Déjà optimisé, ignoré : ${file}`);
      return;
    }

    try {
      // Libère le nom cible
      await renameAsync(file, tempInput);

      // Args ffmpeg robustes + audio optionnelle
      const args = [
  '-hide_banner', '-loglevel', 'error', '-nostdin',
  '-y',
  '-fflags', '+genpts',
  // '-vsync', '2', // décommente si besoin d’un CFR forcé
  '-i', tempInput,

  // ✅ Map explicite : vidéo obligatoire, audio optionnelle
  '-map', '0:v:0',
  '-map', '0:a:0?',

  // Vidéo
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '26',

  // 🔧 Redimensionne (max 720 de large) puis force dimensions paires
  '-vf', "scale=w=720:h=-2:flags=lanczos:force_original_aspect_ratio=decrease,setsar=1,scale=trunc(iw/2)*2:trunc(ih/2)*2",

  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',

  // Audio (ignorée s’il n’y a pas de piste)
  '-c:a', 'aac',
  '-b:a', '96k',

  // Sortie
  outputFile,
];

      await execFileAsync(ffmpegPath, args);

      // ✅ Vérifie la taille du fichier de sortie
      const outStat = await statAsync(outputFile).catch(() => null);
      if (!outStat || outStat.size === 0) {
        throw new Error('Sortie 0 octet détectée');
      }

      await moveToBackup(tempInput, file);
      console.log(`✅ Vidéo optimisée : ${outputFile}`);
    } catch (err) {
      console.error(`❌ Erreur sur ${file} : ${err.message || err}`);

      // Nettoyage + restauration
      try {
        const outStat = fs.existsSync(outputFile) ? fs.statSync(outputFile) : null;
        if (outStat && outStat.size === 0) safeUnlink(outputFile);

        if (fs.existsSync(tempInput) && !fs.existsSync(outputFile)) {
          fs.renameSync(tempInput, outputFile);
          console.log(`↩️ Original restauré : ${outputFile}`);
        }
      } catch (restoreErr) {
        console.error(`⚠️ Échec de restauration pour ${file} : ${restoreErr.message}`);
      }
    }
  };

  for (const f of files) {
    await processVideo(f);
  }

  console.log('🎉 Optimisation MP4 terminée (robuste + audio optionnelle).');
})();
