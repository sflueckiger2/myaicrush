require('dotenv').config(); // Chargement du fichier .env

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const CLOUDFLARE_TOKEN = process.env.CLOUDFLARE_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = 'f314a85fdbee0a4c3228243ddcc5dc8f';
const ROOT_FOLDER = path.join(__dirname, 'public/images');

let cloudflareMap = {};
const MAP_PATH = path.join(__dirname, 'cloudflare-map.json');

// Charger la map existante si elle existe
if (fs.existsSync(MAP_PATH)) {
  try {
    cloudflareMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));
  } catch (err) {
    console.error('❌ Erreur de lecture cloudflare-map.json:', err.message);
    process.exit(1);
  }
}

let total = 0;
let skipped = 0;
let uploaded = 0;

async function uploadImage(filePath, fileName) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), fileName);

  try {
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      form,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_TOKEN}`,
          ...form.getHeaders()
        }
      }
    );
    return response.data.result.variants[0]; // URL publique
  } catch (err) {
    console.error(`❌ Échec upload ${filePath}:`, err.response?.data || err.message);
    return null;
  }
}

async function scanAndUpload(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await scanAndUpload(fullPath);
    } else if (entry.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const relativePath = path.relative(ROOT_FOLDER, fullPath);
      total++;

      if (cloudflareMap[relativePath]) {
        skipped++;
        continue;
      }

      console.log(`⬆️ Upload de ${relativePath}`);
      const url = await uploadImage(fullPath, entry.name);
      if (url) {
        uploaded++;
        cloudflareMap[relativePath] = url;
      }
    }
  }
}

(async () => {
  if (!CLOUDFLARE_TOKEN) {
    console.error("❌ CLOUDFLARE_TOKEN manquant dans .env");
    process.exit(1);
  }

  await scanAndUpload(ROOT_FOLDER);

  fs.writeFileSync(MAP_PATH, JSON.stringify(cloudflareMap, null, 2));
  console.log(`✅ Upload terminé : ${uploaded} fichiers envoyés, ${skipped} ignorés, ${total} au total.`);
})();
