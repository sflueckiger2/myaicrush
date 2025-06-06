const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const util = require('util');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const videosDir = path.resolve(__dirname, '../images');
const backupDir = path.resolve(__dirname, '../backup/videos');

if (!fs.existsSync(videosDir)) {
    console.error(`❌ Le dossier ${videosDir} n'existe pas.`);
    process.exit(1);
}

if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📦 Dossier backup créé : ${backupDir}`);
}

const renameAsync = util.promisify(fs.rename);
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
    console.log("❌ Aucune vidéo trouvée.");
    process.exit(0);
}

const moveToBackup = async (filePath) => {
    try {
        const fileName = path.basename(filePath);
        const destination = path.join(backupDir, fileName);
        await renameAsync(filePath, destination);
        console.log(`📦 Vidéo déplacée vers backup : ${destination}`);
    } catch (err) {
        console.error(`❌ Erreur lors du déplacement de ${filePath}`, err);
    }
};

const convertToWebpAnimated = async (inputPath) => {
    const dir = path.dirname(inputPath);
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(dir, `${fileName}_animated.webp`);

    console.log(`🎞️ Conversion de ${fileName} en WEBP animé...`);

    ffmpeg(inputPath)
        .outputOptions([
            '-vf', 'fps=15,scale=450:-1:flags=lanczos', // Redimensionne + fluidité
            '-loop', '0'
        ])
        .outputFormat('webp')
        .on('end', async () => {
            console.log(`✅ WEBP généré : ${outputPath}`);
            await moveToBackup(inputPath);
        })
        .on('error', (err) => {
            console.error(`❌ Erreur sur ${inputPath} :`, err.message);
        })
        .save(outputPath);
};

videos.forEach(convertToWebpAnimated);
