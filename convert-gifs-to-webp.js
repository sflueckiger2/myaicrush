const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ✅ Dossier à tester
const testDir = path.join('C:', 'Users', 'sflückiger', 'Documents', 'IA', 'public', 'images', 'lila', 'lila1');

fs.readdir(testDir, (err, files) => {
  if (err) return console.error("❌ Erreur lecture dossier :", err);

  files.forEach(file => {
    if (file.endsWith('_animated.webp')) {
      const input = path.join(testDir, file);
      const output = input.replace('_animated.webp', '.mp4');

      // ✅ ffmpeg conversion
      const cmd = `ffmpeg -y -i "${input}" -movflags faststart -pix_fmt yuv420p "${output}"`;
      console.log(`🎬 Conversion : ${file} → ${path.basename(output)}`);

      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error(`❌ Erreur conversion ${file} :`, err.message);
        } else {
          console.log(`✅ Fichier converti : ${output}`);
        }
      });
    }
  });
});
