const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const fs = require('fs');
const path = require('path');
const util = require('util');

const renameAsync = util.promisify(fs.rename);

const videosDir = path.resolve(__dirname, '../images');
const backupDir = path.resolve(__dirname, '../backup/videos');

if (!fs.existsSync(videosDir)) {
    console.error(`❌ Erreur : Le dossier ${videosDir} n'existe pas.`);
    process.exit(1);
}

if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📦 Dossier "backup/videos" créé : ${backupDir}`);
}

const videoExtensions = /\.(mp4|mov|webm|avi|mkv)$/i;

const getAllVideos = (dir, files = []) => {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllVideos(fullPath, files);
        } else if (videoExtensions.test(file)) {
            files.push(fullPath);
        }
    });
    return files;
};

const videos = getAllVideos(videosDir);

if (videos.length === 0) {
    console.log("❌ Aucune vidéo trouvée à convertir.");
    process.exit(0);
}

const moveToBackup = async (filePath) => {
    try {
        const fileName = path.basename(filePath);
        const destination = path.join(backupDir, fileName);
        await renameAsync(filePath, destination);
        console.log(`📦 Vidéo originale déplacée dans backup : ${destination}`);
    } catch (err) {
        console.error(`❌ Erreur lors du déplacement vers backup : ${filePath}`, err);
    }
};

const convertToGif = async (inputPath) => {
    const dir = path.dirname(inputPath);
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(dir, `${fileName}.gif`);

    console.log(`🎬 Conversion de ${fileName}...`);

    ffmpeg(inputPath)
        .outputOptions([
            '-vf', 'fps=15,scale=600:-1:flags=lanczos', // résolution un peu meilleure + FPS 15
            '-loop', '0',                               // boucle infinie
            '-gifflags', '+transdiff',                 // rend le GIF plus fluide
            '-preset', 'slow'                           // meilleure compression, moins de bruit
        ])
        .toFormat('gif')
        .on('end', async () => {
            console.log(`✅ GIF généré : ${outputPath}`);
            await moveToBackup(inputPath);
        })
        .on('error', (err) => {
            console.error(`❌ Erreur sur ${inputPath} :`, err.message);
        })
        .save(outputPath);
};


videos.forEach(convertToGif);
