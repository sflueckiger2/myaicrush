const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const util = require('util');

const renameAsync = util.promisify(fs.rename);
const mkdirAsync = util.promisify(fs.mkdir);

const imagesDir = path.resolve(__dirname, '../images');
const backupDir = path.resolve(__dirname, '../backup');

console.log(`📂 Exploration du dossier : ${imagesDir}`);

if (!fs.existsSync(imagesDir)) {
    console.error(`❌ Erreur : Le dossier ${imagesDir} n'existe pas.`);
    process.exit(1);
}

// 📁 Vérifier si le dossier backup existe, sinon le créer
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📦 Dossier "backup" créé : ${backupDir}`);
}

const getAllFiles = (dir, files = []) => {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, files);
        } else if (/\.(jpg|jpeg|png)$/i.test(file)) { // 🚨 EXCLUSION des GIFs ici
            files.push(fullPath);
        }
    });
    return files;
};

const files = getAllFiles(imagesDir);

if (files.length === 0) {
    console.log("❌ Aucune image trouvée à optimiser.");
    process.exit(1);
}

const moveToBackup = async (filePath) => {
    try {
        const fileName = path.basename(filePath);
        const destination = path.join(backupDir, fileName);
        await renameAsync(filePath, destination);
        console.log(`📦 Image originale déplacée dans backup : ${destination}`);
    } catch (err) {
        console.error(`❌ Erreur lors du déplacement vers backup : ${filePath}`, err);
    }
};

const processImage = async (file) => {
    const ext = path.extname(file).toLowerCase();
    const tempFile = file.replace(ext, `.temp${ext}`);
    const outputFile = file.replace(ext, '.webp');

    try {
        await renameAsync(file, tempFile);

        await sharp(tempFile)
            .webp({ quality: 80 })
            .toFile(outputFile);

        console.log(`✅ Image optimisée : ${outputFile}`);

        await moveToBackup(tempFile);

    } catch (err) {
        console.error(`❌ Erreur sur ${file} :`, err);
    }
};

files.forEach(file => processImage(file));
