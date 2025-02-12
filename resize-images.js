const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 📂 Dossier contenant les images à optimiser
const imageDir = path.join(__dirname, 'public/images');

// 📂 Dossier de sauvegarde des originaux
const backupDir = path.join(__dirname, 'public/images_backup');

// 📌 Crée un dossier de backup si pas encore existant
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// 🖼️ Fonction pour optimiser une image
async function optimizeImage(filePath, outputPath) {
    try {
        // 🔄 Sauvegarde de l'original
        const backupPath = path.join(backupDir, path.relative(imageDir, filePath));
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        fs.copyFileSync(filePath, backupPath);

        // 🔽 Optimisation et conversion
        await sharp(filePath)
            .resize({ width: 800 }) // Redimensionne à max 800px
            .jpeg({ quality: 70 })  // Compression JPEG (qualité 70%)
            .toFile(outputPath);

        console.log(`✅ Optimisé : ${outputPath}`);
    } catch (err) {
        console.error(`❌ Erreur sur ${filePath} :`, err);
    }
}

// 🔎 Fonction pour traiter toutes les images d'un dossier (et sous-dossiers)
function processImages(dir) {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        const outputPath = path.join(dir, file); // Écrase l’original après sauvegarde

        if (fs.statSync(filePath).isDirectory()) {
            processImages(filePath); // 📂 Parcours récursif des sous-dossiers
        } else if (/\.(jpg|jpeg|png)$/i.test(file)) {
            optimizeImage(filePath, outputPath);
        }
    });
}

// 🚀 Lance l'optimisation
console.log("🔄 Optimisation des images...");
processImages(imageDir);
console.log("🎉 Toutes les images ont été optimisées !");
