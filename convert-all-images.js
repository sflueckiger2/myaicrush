const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputFolder = path.join(__dirname, 'public/images'); // 📂 Dossier où chercher les images

// Fonction pour scanner et convertir toutes les images
function convertImagesInFolder(folder) {
    fs.readdirSync(folder).forEach(file => {
        const inputPath = path.join(folder, file);

        // Vérifier si c'est un fichier ou un sous-dossier
        if (fs.statSync(inputPath).isDirectory()) {
            convertImagesInFolder(inputPath); // 📂 Si c'est un dossier, récursif
        } else if (file.match(/\.(jpg|jpeg|png)$/i)) { // 📷 Vérifie si c'est une image JPG ou PNG
            const outputPath = inputPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');

            // Vérifier si l'image WebP existe déjà
            if (fs.existsSync(outputPath)) {
                console.log(`✅ WebP déjà existant : ${outputPath}`);
                return; // ⏩ Passe à l'image suivante
            }

            // Convertir l'image en WebP
            sharp(inputPath)
                .webp({ quality: 80 }) // Ajuste la qualité ici (0-100)
                .toFile(outputPath)
                .then(() => console.log(`✅ Converti : ${inputPath} -> ${outputPath}`))
                .catch(err => console.error(`❌ Erreur sur ${inputPath} :`, err));
        }
    });
}

// Lancer la conversion
console.log("🔄 Conversion en cours...");
convertImagesInFolder(inputFolder);
console.log("✅ Conversion terminée !");
