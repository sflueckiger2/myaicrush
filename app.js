require('dotenv').config(); // Charger les variables d'environnement



console.log("🔑 Clé API EvenLabs chargée :", process.env.EVENLABS_API_KEY ? "OK" : "❌ Manquante !");

const express = require('express');

const axios = require('axios');
const dns = require('dns');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const app = express(); // Initialiser l'instance d'Express

const EVENLABS_API_KEY = process.env.EVENLABS_API_KEY;
const fetch = require('node-fetch'); // ✅ Assure-toi que c'est installé

const nsfw = require('nsfwjs');
const tf = require('@tensorflow/tfjs'); // Version allégée
const { Image } = require('canvas'); // Simuler un DOM pour analyser les images
const { createCanvas, loadImage } = require('canvas');
const userSentImages = new Map(); // email -> Set de noms d’images



app.use((req, res, next) => {
  if (req.hostname === 'img.myaicrush.ai') {
    res.removeHeader('Set-Cookie');
  }
  next();
});


// =========================
// ✅ PREMIUM CACHE (anti-latence)
// =========================
const premiumCache = new Map(); // email -> { value, expiresAt }

// ⚠️ À ADAPTER : ici tu mets la logique qui était déjà dans /api/is-premium
async function getIsPremiumDirect(email) {
  // Exemple si tu lis en DB (projection minimale)
  const database = client.db("MyAICrush");
  const users = database.collection("users");
  const user = await users.findOne(
    { email },
    { projection: { subscriptionInfo: 1, isPremium: 1 } }
  );

  // ✅ adapte selon TON schéma:
  // - soit user.isPremium
  // - soit subscriptionInfo.status === "active" || "cancelled"
  const status = user?.subscriptionInfo?.status;
  if (status === "active" || status === "cancelled") return true;

  return Boolean(user?.isPremium);
}

async function getIsPremiumCached(email, ttlMs = 5 * 60 * 1000) {
  const cached = premiumCache.get(email);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = await getIsPremiumDirect(email);
  premiumCache.set(email, { value, expiresAt: Date.now() + ttlMs });
  return value;
}


// 📦 Chargement du mapping Cloudflare (local path → CDN URL)
let cloudflareMap = {};
try {
    const raw = fs.readFileSync(path.join(__dirname, 'cloudflare-map.json'), 'utf8');
    cloudflareMap = JSON.parse(raw);
    console.log("✅ Mapping Cloudflare chargé !");
} catch (err) {
    console.warn("⚠️ Impossible de charger cloudflare-map.json :", err.message);
}


let nsfwModel = null;


async function getNSFWModel() {
    if (!nsfwModel) {
        console.log("📦 Chargement du modèle NSFW à la volée...");
        nsfwModel = await nsfw.load();
        console.log("✅ Modèle NSFW chargé !");
    }
    return nsfwModel;
}


const { connectToDb, getDb } = require('./db');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;

//Cookie Pour les AB TEST 
const cookieParser = require('cookie-parser');





// ✅ Sélection dynamique de la clé Stripe
const stripeMode = process.env.STRIPE_MODE || "live"; // "live" par défaut
const stripeSecretKey = stripeMode === "live"
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST;
    
const stripe = require('stripe')(stripeSecretKey); // ✅ Initialisation correcte de Stripe
console.log(`🚀 Stripe en mode : ${stripeMode.toUpperCase()}`);
console.log(`🔑 Clé Stripe utilisée : ${stripeSecretKey.startsWith("sk_live") ? "LIVE" : "TEST"}`);
const { createTokenCheckoutSession, handleStripeWebhook } = require('./public/scripts/stripe.js');


const userLastImageDescriptions = new Map(); // Stocke la dernière description d’image pour chaque email






app.use(express.json());
app.use(cookieParser());




app.use('/images', express.static(path.join(__dirname, 'public/images'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));


// 2) Static global (pour le reste du site)
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // uniquement pour les JSON : pas de cache
    if (filePath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
    }
  }
}));
  





const { createCheckoutSession, cancelSubscription, getUserSubscription } = require('./public/scripts/stripe.js');
const { MongoClient } = require('mongodb'); // Import de MongoClient
const bcrypt = require('bcrypt');
const sharp = require('sharp');
const crypto = require('crypto');
const imageTokens = new Map(); // Stocker les images temporairement
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;
const FB_API_URL = `https://graph.facebook.com/v17.0/${FACEBOOK_PIXEL_ID}/events`;


// Liste noire des domaines jetables
const disposableDomains = [
  "yopmail.com", "tempmail.com", "10minutemail.com", "mailinator.com", "guerrillamail.com"
];

// Vérifier si l'email a un format correct
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Vérifier si le domaine de l'email accepte les emails (DNS MX Record)
async function isDisposableOrInvalidEmail(email) {
  return new Promise((resolve) => {
      const domain = email.split('@')[1];

      // Vérifier si c'est un email jetable
      if (disposableDomains.includes(domain)) {
          return resolve(false);
      }

      // Vérification DNS pour s'assurer que le domaine peut recevoir des emails
      dns.resolveMx(domain, (err, addresses) => {
          if (err || !addresses || addresses.length === 0) {
              resolve(false);
          } else {
              resolve(true);
          }
      });
  });
}


const multer = require('multer');


// Stockage temporaire en RAM
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



// Route pour gérer l'upload d'images

const uploadDir = path.join(__dirname, 'public', 'uploads');

// Vérifier si le dossier uploads existe, sinon le créer
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // ✅ Création récursive si besoin
}


async function analyzeImageNsfw(imageBuffer) {
    try {
        // 🔄 Convertir l'image en JPEG pour compatibilité
        const processedImageBuffer = await sharp(imageBuffer)
            .toFormat('jpeg')
            .toBuffer();

        // 📸 Charger l’image
        const image = await loadImage(`data:image/jpeg;base64,${processedImageBuffer.toString('base64')}`);

        // 🖼️ Créer un canvas pour analyse
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, image.width, image.height);

        // 🔍 Prédiction NSFW
        const model = await getNSFWModel();
const predictions = await model.classify(canvas);


        // 🧠 Tri des résultats pour inspection
        const sorted = predictions.sort((a, b) => b.probability - a.probability);
        console.log("🔎 Résultats NSFW (triés) :", sorted);

        // 🔧 Seuils personnalisés
        const seuilPorn = 0.80;   // Avant : 0.85
const seuilHentai = 0.80; // Avant : 0.85
const seuilSexy = 0.97;   // Avant : 0.95


        const isExplicit = predictions.some(pred => {
            if (pred.className === 'Porn' && pred.probability > seuilPorn) return true;
            if (pred.className === 'Hentai' && pred.probability > seuilHentai) return true;
            if (pred.className === 'Sexy' && pred.probability > seuilSexy) return true;
            return false;
        });

        return isExplicit;

    } catch (error) {
        console.error("❌ Erreur lors de l'analyse NSFW :", error);
        return false;
    }
}




app.post('/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Aucune image envoyée" });
    }

    try {
        const userEmail = req.body.email;
        if (!userEmail) {
            return res.status(400).json({ message: "Email requis" });
        }

        const database = client.db('MyAICrush');
        const users = database.collection('users');

        // 🔥 Récupérer l'utilisateur depuis MongoDB
        const user = await users.findOne({ email: userEmail });

        if (!user) {
            return res.status(403).json({ error: "Utilisateur introuvable." });
        }

        const maxFreeImages = 10; // 📌 Limite d'uploads gratuites par mois
        const imagesUploaded = user.imagesUploaded || 0; // 📊 Nombre d'images envoyées ce mois-ci
        const creditsAvailable = user.creditsPurchased || 0; // 🎟️ Jetons disponibles

        // 🔥 Vérifier si l'utilisateur a atteint sa limite d'images gratuites
        if (imagesUploaded >= maxFreeImages) {
            if (creditsAvailable > 0) {
                // 🔥 Déduire 1 crédit pour uploader l’image
                await users.updateOne({ email: userEmail }, { $inc: { creditsPurchased: -1 } });
                console.log(`💳 1 crédit utilisé par ${userEmail} pour uploader une image.`);
            } else {
                console.log(`🚨 ${userEmail} a dépassé la limite d'images et n'a plus de jetons ! Redirection vers /jetons.html.`);
                return res.status(403).json({ 
                    message: "Limite atteinte. Achetez des crédits pour envoyer plus d'images.",
                    redirect: "/jetons.html" // 🔥 Rediriger vers l'achat de jetons
                });
            }
        } else {
            // 🔥 L'utilisateur peut encore envoyer des images gratuites ce mois-ci
            await users.updateOne({ email: userEmail }, { $inc: { imagesUploaded: 1 } });
            console.log(`📸 Image ${imagesUploaded + 1}/${maxFreeImages} envoyée par ${userEmail}`);
        }

        // 🔥 Vérification NSFW avant de continuer
        const isExplicit = await analyzeImageNsfw(req.file.buffer);

        let imageDescription = ""; // 🔥 Initialisation correcte de la variable

        // 🔥 Compression de l'image
        const compressedImageBuffer = await sharp(req.file.buffer)
            .resize({ width: 320 })
            .jpeg({ quality: 60 })
            .toBuffer();

        // 🔥 Sauvegarde temporaire de l’image
        const imageName = `${Date.now()}.jpg`;
        const imagePath = path.join(uploadDir, imageName);

        console.log(`📂 Chemin de sauvegarde de l'image : ${imagePath}`);

        fs.writeFileSync(imagePath, compressedImageBuffer);

        if (isExplicit) {
            console.log("⚠️ Image NSFW détectée !");
            
            // 🛑 Si l'image est NSFW, on ENVOIE une description prédéfinie
            imageDescription = "L'image semble explicite. Réagis de manière adaptée. Certainement un attribut masculin imposant. Flatte l'utilisateur.";

        } else {
            // 📡 Envoi de l'image à OpenAI pour description
            console.log("📡 Envoi de l'image à OpenAI pour analyse...");

            const openaiResponse = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: "gpt-4-turbo",
                    messages: [
                        { role: "system", content: "Décris cette image. Si tu vois une image explicite, décris la avec le mot *inappropriée*. Le tout en moins de 100 tokens." },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Décris cette image brièvement." },
                                { 
                                    type: "image_url", 
                                    image_url: { url: "data:image/jpeg;base64," + compressedImageBuffer.toString("base64") }
                                }
                            ]
                        }
                    ],
                    max_tokens: 100, 
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                        "Content-Type": "application/json"
                    }
                    
                }
            );

            // 🔥 Récupération de la description de l’image
            imageDescription = openaiResponse.data.choices[0]?.message?.content?.trim() || "Une photo intéressante.";
            console.log("📝 Description de l'image par OpenAI :", imageDescription);
        }

        // 📌 Stocker la description temporairement pour cet utilisateur
        if (userEmail) {
            userLastImageDescriptions.set(userEmail, imageDescription);
            console.log(`📝 Description associée à ${userEmail}`);
        }

        console.log("✅ Réponse envoyée après analyse OpenAI");
        // ✅ Réponse avec l'URL de l'image et sa description
        res.json({
            imageUrl: `/uploads/${imageName}`,
            description: imageDescription
        });

    } catch (error) {
        console.error("❌ Erreur lors du traitement de l'image :", error);
        res.status(500).json({ message: "Erreur lors de l'analyse de l'image." });
    }
});

app.post('/api/check-upload-limit', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email requis." });
        }

        const database = client.db('MyAICrush');
        const users = database.collection('users');

        // 🔥 Récupérer l'utilisateur
        const user = await users.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        const maxFreeImages = 10; // 📌 Limite d'uploads gratuites par mois
        const imagesUploaded = user.imagesUploaded || 0; // 📊 Nombre d'images envoyées ce mois-ci
        const creditsAvailable = user.creditsPurchased || 0; // 🎟️ Jetons disponibles

        if (imagesUploaded >= maxFreeImages && creditsAvailable === 0) {
            console.warn(`🚨 ${email} a dépassé la limite et n'a plus de jetons !`);
            return res.json({ canUpload: false, redirect: "/jetons.html" });
        }

        // ✅ L'utilisateur peut uploader une image (gratuitement ou avec ses crédits)
        res.json({ canUpload: true });

    } catch (error) {
        console.error("❌ Erreur lors de la vérification du quota d'images :", error);
        res.status(500).json({ message: "Erreur serveur." });
    }
});




// Route pour récupérer une image temporaire
app.get('/get-uploaded-image/:token', (req, res) => {
    const { token } = req.params;
    const imageData = imageTokens.get(token);

    if (!imageData) {
        return res.status(404).send("Image introuvable ou expirée.");
    }

    res.writeHead(200, { 'Content-Type': imageData.mimetype });
    res.end(imageData.buffer);
});




let firstFreeImageSent = new Map(); // Stocke les utilisateurs qui ont déjà reçu une image non floutée


// Générer un token sécurisé pour accéder à l'image
// Remplace ta fonction actuelle par celle-ci
function generateImageToken(imagePath, isBlurred) {
  // On crée un identifiant stable basé sur le chemin du fichier
  // ex: "aiko1_photo1_blurred" ou "aiko1_photo1_clear"
  const fileName = path.basename(imagePath);
  const folderName = path.dirname(imagePath).split(path.sep).pop();
  const stableId = `${folderName}_${fileName}_${isBlurred ? 'b' : 'c'}`;

  // On garde le token en Map pour la compatibilité avec ton code actuel
  // mais on utilise l'ID stable comme clé
  const cloudflareUrl = cloudflareMap[imagePath] || null;

  imageTokens.set(stableId, {
    imagePath,
    isBlurred,
    cloudflareUrl
  });

  // On ne supprime plus après 10 min, sinon le cache Cloudflare pointera vers du vide
  return stableId;
}



// MongoDB connection string
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Connexion à MongoDB
async function connectToDB() {
    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas!');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); // Quitte l'application si la connexion échoue
    }
}

// Appeler la fonction pour se connecter
connectToDB();





//ROUTE pour l'inscription via email classique 


// ROUTE POUR LA CONNEXION AVEC EMAIL CLASSIQUE

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
      const database = client.db('MyAICrush');
      const users = database.collection('users');

      // Rechercher l'utilisateur par email
      const user = await users.findOne({ email });
      if (!user) {
          return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }

      // Comparer le mot de passe fourni avec le mot de passe haché stocké
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }

      // Réponse avec les informations de l'utilisateur (sans le mot de passe)
      res.status(200).json({
          message: 'Login successful!',
          user: {
              email: user.email,
          },
      });
  } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});


//ROUTE POUR CHANGER MDP EMAIL CLASSIQUE


app.post('/api/change-password', async (req, res) => {
    console.log('Password change request received:', req.body);

    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        // Rechercher l'utilisateur par email
        const user = await users.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Vérifier si le mot de passe actuel est correct
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid current password' });
        }

        // Générer un hash pour le nouveau mot de passe
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Mettre à jour le mot de passe dans la base de données
        await users.updateOne({ email }, { $set: { password: hashedNewPassword } });

        res.status(200).json({ message: 'Password changed successfully!' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/api/reset-password', async (req, res) => {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
        return res.status(400).json({ message: "Données manquantes." });
    }

    try {
        const db = client.db('MyAICrush');
        const users = db.collection('users');

        const user = await users.findOne({ email, resetToken: token });

        if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
            return res.status(400).json({ message: "Lien expiré ou invalide." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await users.updateOne(
            { email },
            {
                $set: { password: hashedPassword },
                $unset: { resetToken: "", resetTokenExpires: "" }
            }
        );

        res.json({ message: "Mot de passe mis à jour avec succès." });
    } catch (err) {
        console.error("❌ Erreur maj mdp:", err);
        res.status(500).json({ message: "Erreur serveur." });
    }
});

app.post('/api/generate-reset-token', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email requis." });
    }

    try {
        const db = client.db('MyAICrush');
        const users = db.collection('users');

        const user = await users.findOne({ email });

        // On ne révèle pas si le compte existe ou non
        if (!user) {
            console.log("⚠️ Demande de reset pour un email inconnu :", email);
            return res.json({
                message: "Si un compte existe avec cette adresse e-mail, un lien de réinitialisation t’a été envoyé par email. Il peut parfois mettre quelques minutes à arriver."
            });
        }

        // 🎲 Générer le token + expiration
        const token = crypto.randomBytes(20).toString('hex');
        const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        await users.updateOne(
            { email },
            {
                $set: {
                    resetToken: token,
                    resetTokenExpires: expiration
                }
            }
        );

        const resetUrl = `${BASE_URL}/reset-password-oneshot.html?email=${encodeURIComponent(email)}&token=${token}`;

        console.log(`🔗 Lien de reset généré : ${resetUrl}`);
        console.log("ELASTICEMAIL_API_KEY chargée ?", !!process.env.ELASTICEMAIL_API_KEY);

        // 📧 Envoi email via ELASTIC EMAIL (API v2)
        const fromEmail = process.env.RESET_FROM_EMAIL || "contact@myaicrush.ai";
        const fromName  = process.env.RESET_FROM_NAME || "MyAiCrush";

        const subject = "Réinitialisation de ton mot de passe MyAiCrush 💗";

        const bodyHtml = `
            <p>Bonjour,</p>
            <p>Tu as demandé à réinitialiser ton mot de passe sur <strong>MyAiCrush</strong>.</p>
            <p>Clique sur ce lien pour choisir un nouveau mot de passe (valable 24h) :</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email.</p>
        `;

        const bodyText = `
Bonjour,

Tu as demandé à réinitialiser ton mot de passe sur MyAiCrush.

Voici le lien (valable 24h) :
${resetUrl}

Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email.
        `.trim();

        // Elastic Email attend du x-www-form-urlencoded
        const params = new URLSearchParams();
        params.append('apikey', process.env.ELASTICEMAIL_API_KEY);
        params.append('from', fromEmail);
        params.append('fromName', fromName);
        params.append('to', email);
        params.append('subject', subject);
        params.append('bodyHtml', bodyHtml);
        params.append('bodyText', bodyText);
        params.append('isTransactional', 'true');

        console.log("📤 Envoi à Elastic Email avec ces params (sans le bodyHtml complet) :", {
            from: fromEmail,
            fromName,
            to: email,
            subject,
            isTransactional: 'true'
        });

        const elasticResponse = await axios.post(
            'https://api.elasticemail.com/v2/email/send',
            params
        );

        console.log("✅ Réponse Elastic Email :", elasticResponse.data);

        return res.json({
            message: "Si un compte existe avec cette adresse e-mail, un lien de réinitialisation t’a été envoyé par email. Il peut parfois mettre quelques minutes à arriver."
        });

    } catch (err) {
        console.error("❌ Erreur génération token / envoi Elastic Email :", err.response?.data || err.message);

        return res.status(500).json({
            message: "Erreur lors de l'envoi de l'email de réinitialisation.",
            elasticError: err.response?.data || null
        });
    }
});



// Route pour créer une session de paiement Stripe
app.post('/api/create-checkout-session', async (req, res) => {
    console.log('📡 Requête reçue sur /api/create-checkout-session');
    console.log('Corps de la requête :', req.body);
  
    try {
        const { planType, email, testId } = req.body;
  
        if (!planType || !email) {
            return res.status(400).json({ message: "Email et planType requis." });
        }
  
        console.log('📦 Plan sélectionné :', planType);
        console.log('📧 Email reçu :', email);
  
        // 🔥 Charger le fichier pricing-config.json pour chercher le bon priceId
        const configPath = path.join(__dirname, 'public', 'pricing-config.json');
        const rawData = fs.readFileSync(configPath);
        const pricingConfig = JSON.parse(rawData);
  
        const stripeMode = process.env.STRIPE_MODE || "live";

        let selectedPlan;

if (testId && testId !== 'default') {
    const activeTest = pricingConfig.active_tests.find(test => test.id === testId);
    if (activeTest) {
        selectedPlan = activeTest.variants.find(p => p.name.toLowerCase().includes(planType.toLowerCase()));
    }
}

if (!selectedPlan) {
    selectedPlan = pricingConfig.default_price.variants.find(p => p.name.toLowerCase().includes(planType.toLowerCase()));
}

if (!selectedPlan) {
    throw new Error(`❌ Plan "${planType}" non trouvé pour le test "${testId || 'default'}" dans pricing-config.json`);
}

  
        // 🔍 On cherche dans default + tests
       // Fusionner toutes les variantes de tous les tests actifs
const allTestVariants = pricingConfig.active_tests.flatMap(test => test.variants);

  
        const priceId = stripeMode === "live"
            ? selectedPlan.stripe_id_live
            : selectedPlan.stripe_id_test;
  
        if (!priceId) {
            throw new Error(`❌ Aucun price ID défini pour le mode ${stripeMode} sur le plan "${planType}"`);
        }
  
        console.log('💳 Price ID utilisé :', priceId);

        // ✅ On récupère l’ID du test actif (ou "default" si aucun)
        const activeTestId = pricingConfig.active_tests?.[0]?.id || 'default';


        // ✅ Création de la session Stripe
       const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: email,
    payment_method_collection: 'always',
    subscription_data: {
        trial_settings: {
            end_behavior: {
                missing_payment_method: 'cancel'
            }
        }
    },
    metadata: {
        fbp: req.body.fbp || null,
        fbc: req.body.fbc || null,
        fbqPurchaseEventID: `purchase_${Date.now()}`
    },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.BASE_URL}/confirmation.html?amount=${selectedPlan.price}&plan=${planType}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/premium.html`
});

  
        console.log('✅ Session Checkout créée avec succès :', session.url);
        res.json({ url: session.url });
  
    } catch (error) {
        console.error('❌ Erreur lors de la création de la session Stripe:', error.message);
        res.status(500).json({ message: 'Failed to create checkout session' });
    }
});








// ROUTE afficher l'abo

app.post('/api/get-user-subscription', async (req, res) => {
  const { email } = req.body;

  if (!email) {
      return res.status(400).json({ message: 'Email is required' });
  }

  try {
      const subscriptionInfo = await getUserSubscription(email);
      res.status(200).json(subscriptionInfo);
  } catch (error) {
      console.error('Error fetching subscription info:', error.message);
      res.status(500).json({ message: 'Error fetching subscription info' });
  }
});


// =========================
// 🔍 Vérification premium Stripe (optimisée)
// =========================

async function checkPremiumStripe(email) {
  const cleanEmail = email.trim().toLowerCase();
  console.log(`\n🔎 checkPremiumStripe pour ${cleanEmail}`);

  let customers = [];

  // 1) Tentative avec customers.search (rapide)
  try {
    const searchResult = await stripe.customers.search({
      query: `email:"${cleanEmail}"`
    });
    customers = searchResult.data || [];
    console.log(`   → customers.search : ${customers.length} client(s) trouvé(s)`);
  } catch (err) {
    console.error("   ⚠️ Erreur stripe.customers.search, on tente list():", err.message || err);
  }

  // 2) Fallback : customers.list({ email }) si search n'a rien trouvé
  if (!customers.length) {
    try {
      const listResult = await stripe.customers.list({
        email: cleanEmail,
        limit: 10
      });
      customers = listResult.data || [];
      console.log(`   → customers.list : ${customers.length} client(s) trouvé(s)`);
    } catch (err) {
      console.error("   ❌ Erreur stripe.customers.list:", err.message || err);
      return false;
    }
  }

  if (!customers.length) {
    console.log(`   ❌ Aucun customer Stripe pour ${cleanEmail}`);
    return false;
  }

  let latestSub = null;

  // 3) On parcourt les subscriptions de chaque customer
  for (const customer of customers) {
    console.log(`   👤 Client ${customer.id} (${customer.email})`);

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10
    });

    if (!subs.data.length) {
      console.log(`      → aucune subscription`);
      continue;
    }

    for (const sub of subs.data) {
      console.log(`      → Sub ${sub.id} | status=${sub.status} | created=${sub.created}`);

      if (sub && (sub.status === 'active' || sub.status === 'canceled')) {
        if (!latestSub || sub.created > latestSub.created) {
          latestSub = sub;
        }
      }
    }
  }

  if (!latestSub) {
    console.log(`   ❌ Aucun abonnement (actif ou annulé) pour ${cleanEmail}`);
    return false;
  }

  console.log(`   ✅ Abonnement Stripe trouvé pour ${cleanEmail} | status=${latestSub.status}`);

  // 👉 Si tu veux seulement les abonnements ACTIFS : remplace par
  // return latestSub.status === 'active';
  return true;
}



// =====================================
// 🔍 Vérification premium Gumroad (+ éventuel flag en base)
// =====================================
async function checkPremiumGumroad(email) {
  try {
    const database = client.db("MyAICrush");
    const users = database.collection("users");

    // 1) Flag en base (si jamais tu mets un jour lifetimePremium etc.)
    const user = await users.findOne({ email });

    if (user && (user.isPremium === true || user.lifetimePremium === true || user.premium === true)) {
      return true;
    }

    // 2) Vérif via Gumroad (one-shot)
    const GUMROAD_ACCESS_TOKEN = process.env.GUMROAD_ACCESS_TOKEN;
    const GUMROAD_PRODUCT_ID   = process.env.GUMROAD_PRODUCT_ID; // ID du produit MyAICrush

    if (!GUMROAD_ACCESS_TOKEN || !GUMROAD_PRODUCT_ID) {
      console.warn("⚠️ Gumroad non configuré (GUMROAD_ACCESS_TOKEN / GUMROAD_PRODUCT_ID manquants)");
      return false;
    }

    const response = await axios.get('https://api.gumroad.com/v2/sales', {
      params: {
        access_token: GUMROAD_ACCESS_TOKEN,
        product_id:   GUMROAD_PRODUCT_ID,
        email:        email
      }
    });

    const data = response.data;

    // Si au moins 1 vente pour cet email et ce produit → premium = true
    if (data && data.success && Array.isArray(data.sales) && data.sales.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Erreur checkPremiumGumroad:', error.response?.data || error.message);
    return false; // en cas d’erreur on reste safe
  }
}


// =====================================
// 🔧 Helper global : STRIPE (abo) OU GUMROAD (one-shot)
// =====================================
async function getPremiumStatus(email) {
  // 1) On commence par Stripe (abonnements)
  try {
    const isStripePremium = await checkPremiumStripe(email);
    if (isStripePremium) {
      console.log(`✅ Premium via STRIPE pour ${email}`);
      return true;
    }
  } catch (err) {
    console.error("❌ Erreur checkPremiumStripe:", err.message || err);
    // on ne throw pas, on laisse une chance à Gumroad
  }

  // 2) Si pas premium Stripe → on teste Gumroad
  try {
    const isGumroadPremium = await checkPremiumGumroad(email);
    if (isGumroadPremium) {
      console.log(`✅ Premium via GUMROAD pour ${email}`);
      return true;
    }
  } catch (err) {
    console.error("❌ Erreur checkPremiumGumroad:", err.message || err);
  }

  // 3) Ni Stripe ni Gumroad
  console.log(`⛔ Aucun premium trouvé pour ${email}`);
  return false;
}


// =========================
// ✅ ROUTE : VERIFIER SI PREMIUM (FAST + CACHE)
// =========================

// Cache mémoire : email -> { value, expiresAt, refreshing }

app.post('/api/is-premium', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email requis' });
  }

  try {
    const now = Date.now();
    const cached = premiumCache.get(email);

    // ✅ 1) Cache valide → réponse immédiate
    if (cached && cached.expiresAt > now) {
      return res.json({ isPremium: cached.value, cached: true });
    }

    // ✅ 2) Cache expiré mais existant → on renvoie quand même (stale)
    // et on refresh en arrière-plan (non bloquant)
    if (cached && !cached.refreshing) {
      cached.refreshing = true;

      void (async () => {
        try {
          const value = await getPremiumStatus(email); // <– helper combiné
          premiumCache.set(email, {
            value,
            expiresAt: Date.now() + 60_000, // cache frais 60s
            refreshing: false
          });
        } catch (e) {
          console.error("❌ Erreur refresh cache /api/is-premium:", e.message || e);
          // En cas d’erreur → on garde l’ancien cache quelques secondes
          premiumCache.set(email, {
            value: cached.value,
            expiresAt: Date.now() + 15_000,
            refreshing: false
          });
        }
      })();

      return res.json({ isPremium: cached.value, cached: true, stale: true });
    }

    // ✅ 3) Aucun cache → vérifie Stripe + Gumroad UNE FOIS (bloquant)
    const value = await getPremiumStatus(email);

    premiumCache.set(email, {
      value,
      expiresAt: now + 60_000,
      refreshing: false
    });

    return res.json({ isPremium: value, cached: false });

  } catch (error) {
    console.error('❌ Erreur /api/is-premium:', error.message || error);
    return res.status(500).json({ isPremium: false });
  }
});



// ROUTE POUR ANNULER ABO STRIPE

app.post('/api/cancel-subscription', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    console.log('🚫 Email manquant dans la requête');
    return res.status(400).json({ message: 'Email requis' });
  }

  try {
    console.log(`📡 Annulation d’abonnement demandée pour : ${email}`);

    // 🔍 Recherche tous les clients Stripe avec cet email
    const customers = await stripe.customers.search({
      query: `email:"${email}"`
    });

    if (!customers || customers.data.length === 0) {
      console.log(`❌ Aucun client Stripe trouvé pour ${email}`);
      return res.status(404).json({ message: 'Aucun client Stripe trouvé pour cet email.' });
    }

    console.log(`👥 ${customers.data.length} clients Stripe trouvés pour ${email}`);

    let latestSub = null;

    for (const customer of customers.data) {
      console.log(`🔎 Recherche d’abonnements pour le client Stripe : ${customer.id}`);

      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 10
      });

      console.log(`📦 ${subscriptions.data.length} abonnements trouvés pour ${customer.id}`);

      for (const sub of subscriptions.data) {
        console.log(`➡️  Abonnement : ${sub.id} | Status: ${sub.status} | Créé le: ${new Date(sub.created * 1000).toISOString()}`);

        if (['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status)) {
          if (!latestSub || sub.created > latestSub.created) {
            latestSub = sub;
            console.log(`✅ Candidat sélectionné pour annulation : ${sub.id}`);
          }
        }
      }
    }

    if (latestSub) {
      console.log(`🚨 Annulation de l’abonnement le plus récent : ${latestSub.id} | Status: ${latestSub.status}`);
      
      const updated = await stripe.subscriptions.update(latestSub.id, {
        cancel_at_period_end: true
      });

      console.log(`🔔 Résultat de l’annulation : cancel_at_period_end = ${updated.cancel_at_period_end}`);

      return res.status(200).json({ success: true });
    }

    console.log(`❌ Aucun abonnement actif/trialing/past_due/unpaid trouvé pour ${email}`);
    return res.status(404).json({ message: 'Aucun abonnement actif à annuler.' });

  } catch (error) {
    console.error('❌ Erreur lors de l’annulation de l’abonnement :', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de l’annulation de l’abonnement.' });
  }
});




// Charger les personnages depuis le fichier JSON
const characters = require('./characters.json');

// Configuration Google OAuth

const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // Assurez-vous que ces variables sont dans votre fichier .env
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Middleware pour rediriger vers Google pour l'authentification
app.get('/auth/google', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
  });
  res.redirect(authUrl);
});

// ENDPOINT GOOGLE AUTH
// Callback pour gérer la réponse après l'authentification Google
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;

  try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      const ticket = await oAuth2Client.verifyIdToken({
          idToken: tokens.id_token,
          audience: CLIENT_ID,
      });
      const payload = ticket.getPayload();

      const userEmail = payload.email;

      // Vérifier si l'utilisateur existe déjà dans la base de données
      const database = client.db('MyAICrush');
      const usersCollection = database.collection('users');

      const existingUser = await usersCollection.findOne({ email: userEmail });
      const isNewUser = !existingUser;

      if (!existingUser) {
        await usersCollection.insertOne({ 
          email: userEmail, 
          createdAt: new Date(), 
          audioMinutesUsed: 0, 
          creditsPurchased: 0
        });

        console.log(`✅ Nouvel utilisateur Google ajouté avec crédits : ${userEmail}`);

        // ✅ Ajout à Elastic Email pour les nouveaux utilisateurs
        await addUserToElastic(userEmail);
      }

      console.log('Utilisateur Google authentifié :', userEmail);

      // Tu peux garder une logique différente pour new/existing si tu veux, là c'est la même :
      const redirectUrl = isNewUser 
        ? `${BASE_URL}/index.html` 
        : `${BASE_URL}/index.html`;

      // Réponse HTML avec un script pour stocker l'utilisateur dans localStorage et rediriger
      res.send(`
        <script>
            localStorage.setItem('user', JSON.stringify({ email: "${userEmail}" }));
            window.location.href = '${redirectUrl}';
        </script>
      `);
  } catch (error) {
      console.error("Erreur lors de l'authentification Google:", error);
      res.status(500).send('Erreur d\'authentification');
  }
});









// Ajouter un middleware pour servir le fichier characters.json à partir de la racine
app.get('/characters.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'characters.json'));
});

let conversationHistory = [];
const userLevels = new Map(); // 🔥 Stocke le niveau de chaque utilisateur
let photoSentAtLittleCrush = false; // Variable pour suivre l'envoi de la photo au niveau Little Crush
let photoSentAtBigCrush = false; // Variable pour suivre l'envoi de la photo au niveau Big Crush
let photoSentAtPerfectCrush = false;


const userCharacters = new Map(); // ✅ Associe chaque email à un personnage
const userConversationHistory = new Map();
const userPhotoStatus = new Map();




// Fonction pour supprimer les accents
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Supprime les accents
}

// Fonction pour changer le personnage actif
app.post('/setCharacter', async (req, res) => {
    console.log('🔄 Requête reçue pour changer de personnage :', req.body);
  
    const { email, name } = req.body;
    if (!email || !name) {
        return res.status(400).json({ success: false, message: "Email et personnage requis." });
    }
  
    const character = characters.find(c => c.name === name);
    if (!character) {
        return res.status(400).json({ success: false, message: "Personnage inconnu." });
    }
  
    try {
        // ✅ Stocker le personnage pour cet utilisateur uniquement (mémoiree)
        userCharacters.set(email, character);
        console.log(`✅ Personnage défini pour ${email} : ${character.name}`);
  
        // ✅ Réinitialiser l'historique de conversation uniquement pour cet utilisateur
        userConversationHistory.set(email, []);
  
        // ✅ Réinitialiser le statut d'envoi des photos pour cet utilisateur
        userPhotoStatus.set(email, {
            photoSentAtLittleCrush: false,
            photoSentAtBigCrush: false,
            photoSentAtPerfectCrush: false
        });
        userLevels.set(email, 1.0);
console.log(`🔄 Niveau utilisateur réinitialisé à 1.0 pour ${email}`);

  
        // 🔥 Sauvegarde du personnage en base de données
        const database = client.db('MyAICrush');
        const users = database.collection('users');
        await users.updateOne({ email }, { $set: { selectedCharacter: name } }, { upsert: true });
  
        console.log(`💾 Personnage sauvegardé en base pour ${email} : ${name}`);
  
        res.json({ success: true, message: `${name} est maintenant actif.` });
  
    } catch (error) {
        console.error("❌ Erreur lors de la sauvegarde en base :", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la mise à jour du personnage." });
    }
  });
  
  // Ajouter un message à l'historique
  function addMessageToHistory(email, role, content) {
    if (!content) return;
  
    if (!userConversationHistory.has(email)) {
      userConversationHistory.set(email, []);
    }
  
    const history = userConversationHistory.get(email);
    history.push({ role, content });
  
    if (history.length > 10) {
      history.shift(); // ✅ Garde seulement les 5 derniers messages
    }
  
    userConversationHistory.set(email, history);
  }
  


// FONCTION POUR GOOGLE AUTH
async function addOrFindUser(email) {
  const db = getDb();
  const usersCollection = db.collection('users');

  let user = await usersCollection.findOne({ email });

  if (!user) {
      user = { email, createdAt: new Date() }; // Pas de champ "name"
      await usersCollection.insertOne(user);
      console.log(`Nouvel utilisateur ajouté : ${email}`);
  } else {
      console.log(`Utilisateur existant trouvé : ${email}`);
  }

  return user;
}



// Récupérer une image aléatoire pour le personnage actif (Base64)




async function getRandomCharacterMedia(email, isPremium, userLevel, isGifMode, isNymphoMode = false) {


  const userCharacter = userCharacters.get(email); // 🔥 Récupère le personnage spécifique de cet utilisateur
  if (!userCharacter) {
      console.error(`❌ Erreur : Aucun personnage défini pour ${email}`);
      return null;
  }

  const sanitizedCharacterName = removeAccents(userCharacter.name.toLowerCase());
  
  userLevel = userLevels.get(email) || 1.0;

  let levelFolder;

  // 🔥 Si le mode nympho est activé, forcer le dossier "4" (niveau spécial)
if (isNymphoMode) {
    levelFolder = `${sanitizedCharacterName}4`;
    console.log(`💋 Mode nympho activé pour ${email}, utilisation du dossier ${levelFolder}`);
} else {
    if (userLevel < 1.3) {
        levelFolder = `${sanitizedCharacterName}1`; // Little Crush
    } else if (userLevel < 1.5) {
        levelFolder = `${sanitizedCharacterName}3`; // Big Crush
    } else {
        levelFolder = `${sanitizedCharacterName}3`; // Perfect Crush
    }
}



  const imageDir = path.join(__dirname, 'public', 'images', sanitizedCharacterName, levelFolder);
  console.log(`📂 Chemin du dossier média pour ${email} : ${imageDir}`);

  try {
      if (!fs.existsSync(imageDir)) {
          console.error(`❌ Le dossier ${imageDir} n'existe pas.`);
          return null;
      }

      // 🔥 Sélection des fichiers en fonction du mode
    const allFiles = fs.readdirSync(imageDir);

let mediaFiles = [];

if (isGifMode) {
    const mp4Files = allFiles.filter(file => file.toLowerCase().endsWith('.mp4'));
    if (mp4Files.length > 0) {
        mediaFiles = mp4Files;
    } else {
        mediaFiles = allFiles.filter(file => file.endsWith('_animated.webp'));
    }
} else {
    mediaFiles = allFiles.filter(file =>
        !file.endsWith('_animated.webp') && file.endsWith('.webp')
    );
}



      if (mediaFiles.length === 0) {
          console.error(`⚠️ Aucun fichier trouvé dans ${imageDir}`);
          return null;
      }

      // 🆕 Empêcher les doublons d’image dans une même session
const alreadySent = userSentImages.get(email) || new Set();
const availableMedia = mediaFiles.filter(file => !alreadySent.has(file));

// Si toutes les images ont été envoyées, on remet la liste à zéro
if (availableMedia.length === 0) {
    console.warn(`🚫 Toutes les images ont déjà été envoyées à ${email}. Réinitialisation.`);
    availableMedia.push(...mediaFiles);
    alreadySent.clear();
}

// 🎲 Sélection aléatoire d'une image non encore envoyée
const randomMedia = availableMedia[Math.floor(Math.random() * availableMedia.length)];
alreadySent.add(randomMedia);
userSentImages.set(email, alreadySent);

const mediaPath = path.join(imageDir, randomMedia);
console.log(`📸 Média sélectionné pour ${email} : ${mediaPath}`);


      if (!fs.existsSync(mediaPath)) {
          console.error(`❌ Le fichier sélectionné ${mediaPath} n'existe pas.`);
          return null;
      }

      // ✅ Par défaut, les abonnés premium voient les médias nets
     // 🔐 RÈGLE ABSOLUE : un premium ne voit JAMAIS de flou
let isBlurred = false;

if (!isPremium) {
  const userPhotoData = userPhotoStatus.get(email) || { photoSentAtLittleCrush: false };

  if (userLevel > 1.6 || isNymphoMode) {
    isBlurred = true;
  } else if (!firstFreeImageSent.has(email)) {
    firstFreeImageSent.set(email, true);
  } else {
    isBlurred = true;
  }

  userPhotoStatus.set(email, {
    ...userPhotoData,
    photoSentAtLittleCrush: true
  });
} else {
  // 🔥 Sécurité HARD : même si une logique future se trompe
  isBlurred = false;
}


      console.log(`📧 Vérification pour ${email} - Premium : ${isPremium} - Niveau utilisateur : ${userLevel}`);
      console.log(`📸 Média ${isBlurred ? "flouté" : "non flouté"} envoyé pour ${email}`);

      return { 
    token: generateImageToken(mediaPath, isBlurred), 
    isBlurred: isBlurred,
    fileName: randomMedia // ⬅️ Ajouté pour déduire le type de fichier
};


  } catch (err) {
      console.error(`❌ Erreur lors de la récupération du média pour ${email} :`, err);
      return null;
  }
}







app.get('/get-image/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const imageData = imageTokens.get(token);

    if (!imageData) {
      console.error("Image token invalide ou expiré.");
      return res.status(403).send('Access Denied'); // Répondre une seule fois
    }

        const { imagePath, isBlurred, cloudflareUrl } = imageData;

    // 🔁 Si l’image n’est pas floutée et a une version Cloudflare → Rediriger
    if (!isBlurred && cloudflareUrl) {
        console.log(`🔁 Redirection CDN Cloudflare : ${cloudflareUrl}`);
        return res.redirect(302, cloudflareUrl);
    }



    console.log(`📸 Chargement de l'image : ${imagePath} (Floutée : ${isBlurred})`);

    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Fichier introuvable : ${imagePath}`);
      return res.status(404).send('Image non trouvée');
    }

    let contentType;
if (imagePath.endsWith('.webp')) {
  contentType = 'image/webp';
} else if (imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
  contentType = 'image/jpeg';
} else if (imagePath.endsWith('.gif')) {
  contentType = 'image/gif';
} else if (imagePath.endsWith('.mp4')) {
  contentType = 'video/mp4';
} else {
  contentType = 'application/octet-stream';
}



    let imageBuffer;
    
    

    if (isBlurred) {
      console.log("💨 Application du flou renforcé...");
  
      if (imagePath.endsWith('.gif')) {
          console.log("🎥 Floutage GIF renforcé en cours...");
  
          const gifBuffer = fs.readFileSync(imagePath);
  
          // ✅ EXTRAIT UNIQUEMENT LA PREMIÈRE FRAME et la transforme en image fixe floutée avec un flou plus fort
          imageBuffer = await sharp(gifBuffer, { animated: false }) // 🔥 Transforme le GIF en image statique
              .resize({ width: 500 }) // ✅ Taille optimisée
              .blur(45) // 🔥 Flou renforcé (10 → 15)
              .jpeg({ quality: 70 }) // ✅ Compression JPEG pour ultra-rapidité
              .toBuffer();
  
          console.log("✅ GIF transformé en image fixe et flouté plus fortement !");
      } else {
          console.log("🖼️ Floutage d'une image standard...");
          imageBuffer = await sharp(imagePath)
              .resize({ width: 700 }) // ✅ Taille optimisée
              .blur(45) // 🔥 Flou renforcé (15 → 25)
              .jpeg({ quality: 65 }) // ✅ Compression plus forte (70 → 65)
              .toBuffer();
      }
  } else {
      // 🔥 Envoi direct de l’image/GIF sans modification
      console.log("📤 Envoi d'une image/GIF sans flou.");
      imageBuffer = fs.readFileSync(imagePath);
  }
  



  // NOUVELLES LIGNES :
res.setHeader('Content-Type', contentType);
res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');


if (imagePath.endsWith('.mp4')) {
  console.log("🎬 Envoi direct du flux vidéo .mp4");

  const stat = fs.statSync(imagePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(imagePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });

    fs.createReadStream(imagePath).pipe(res);
  }

  return; // ✅ Important : on sort ici pour éviter res.end() plus bas
}

else {
  res.end(imageBuffer, 'binary');
}

  } catch (error) {
    console.error("❌ Erreur lors du chargement de l'image :", error);
    if (!res.headersSent) {
      res.status(500).send("Erreur lors du chargement de l'image.");
    }
  }
});








// Extraire le niveau de confort depuis la réponse du bot
function extractComfortLevel(botReply) {
  const comfortMatch = botReply.match(/\[CONFORT:\s*(very comfortable|comfortable|neutral|uncomfortable|very uncomfortable)\]/i);
  return comfortMatch ? comfortMatch[1].toLowerCase() : "comfortable";

}

// Ajuster le niveau de l'utilisateur en fonction du confort extrait
function adjustUserLevel(email, comfortLevel) {
  let levelChange = 0;
  if (comfortLevel === 'very comfortable') {
    levelChange = 0.2;
  } else if (comfortLevel === 'comfortable') {
    levelChange = 0.1;
  } else if (comfortLevel === 'uncomfortable') {
    levelChange = -0.1;
  } else if (comfortLevel === 'very uncomfortable') {
    levelChange = -0.2;
  }

  const previousLevel = userLevels.get(email) || 1.0; // 🔥 Récupère le niveau spécifique
  const newLevel = Math.max(1.0, previousLevel + levelChange); // 🔥 Met à jour correctement
  userLevels.set(email, newLevel); // ✅ Stocke le nouveau niveau utilisateur

  console.log(`📈 [${email}] Confort: ${comfortLevel}, Changement: ${levelChange}, Nouveau Niveau: ${newLevel}, Ancien Niveau: ${previousLevel}`);

  if (levelChange > 0 && newLevel > previousLevel) {
    if (newLevel >= 1.1 && previousLevel < 1.1) return { message: "Niveau supérieur : tu débloques une photo", type: "up" };
    if (newLevel >= 1.3 && previousLevel < 1.3) return { message: "Niveau supérieur : ça devient plus chaud", type: "up" };
    if (newLevel >= 1.5 && previousLevel < 1.5) return { message: "Niveau supérieur : Déblocage photos intimes", type: "up" };
  } else if (levelChange < 0 && previousLevel > newLevel) {
    if (newLevel < 1.3 && previousLevel >= 1.3) return { message: "Tu baisses dans son estime", type: "down" };
    if (newLevel < 1.5 && previousLevel >= 1.5) return { message: "Ça ne lui a pas plu.", type: "down" };
  }

  return null;
}


//ROUTE ACTIVER NYMPHO

// 🔥 Pour stocker le statut nympho
const userNymphoStatus = new Map();

// ✅ Activation du mode nympho avec consommation unique de jetons (durée : 24h)
app.post('/api/activate-nympho-mode', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email manquant" });

    const activeCharacter = userCharacters.get(email);
    if (!activeCharacter || !activeCharacter.name) {
        return res.status(400).json({ success: false, message: "Personnage non défini." });
    }

    const characterName = activeCharacter.name;
    const now = Date.now();

    try {
        const db = client.db("MyAICrush");
        const users = db.collection("users");

        const user = await users.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });

        const jetons = user.creditsPurchased || 0;
        const nymphoData = user.nymphoUnlocked || {};

        const currentExpiration = nymphoData[characterName];

        // ✅ Vérifie si déjà activé
        if (currentExpiration && currentExpiration > now) {
            return res.json({ success: true, alreadyActive: true });
        }

        // ❌ Pas assez de jetons
        if (jetons < 25) {
    return res.status(403).json({ success: false, message: "Pas assez de jetons", showJetonsPopup: true });
}


        // ✅ Déduire les jetons et enregistrer l’activation pour 24h
        const expiresAt = now + 24 * 60 * 60 * 1000;

        await users.updateOne(
            { email },
            {
                $set: { [`nymphoUnlocked.${characterName}`]: expiresAt },
                $inc: { creditsPurchased: -25 }
            }
        );

        userNymphoStatus.set(`${email}_${characterName}`, { active: true, expiresAt });

        console.log(`💋 Nympho activé pour ${characterName} par ${email} jusqu'à ${new Date(expiresAt).toLocaleString()}`);

        return res.json({ success: true, expiresAt });
    } catch (err) {
        console.error("❌ Erreur activation mode nympho :", err);
        return res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});




//ROUTE DESACTIVER NYMPHO

app.post('/api/deactivate-nympho-mode', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email manquant" });
    }

    userNymphoStatus.set(email, false);
    console.log(`😇 Mode nymphomane désactivé pour ${email}`);

    res.json({ success: true, message: "Mode nymphomane désactivé" });
});


// route pour check le status NYMPHO
app.post('/api/check-nympho-status', async (req, res) => {
    const { email, character } = req.body;
  
    if (!email || !character) {
        return res.status(400).json({ alreadyUnlocked: false, message: "Email ou personnage manquant." });
    }
  
    try {
        const database = client.db("MyAICrush");
        const users = database.collection("users");
  
        const user = await users.findOne({ email });
  
        if (!user || !user.nymphoUnlocked) {
            return res.json({ alreadyUnlocked: false });
        }
  
        const unlockTimestamp = user.nymphoUnlocked[character];

        if (!unlockTimestamp || typeof unlockTimestamp !== 'number') {
            return res.json({ alreadyUnlocked: false });
        }

        const now = Date.now();

        if (unlockTimestamp > now) {
            return res.json({ alreadyUnlocked: true });
        } else {
            return res.json({ alreadyUnlocked: false });
        }
  
    } catch (err) {
        console.error("❌ Erreur lors de la vérification du statut nympho :", err);
        return res.status(500).json({ alreadyUnlocked: false, message: "Erreur interne du serveur." });
    }
});

  
// =========================
// ✅ QUICK REPLIES (PROD SAFE)
// - 2 routes : /quick-replies-initial + /quick-replies
// - timeout Fireworks court (anti-freeze)
// - cache mémoire (initial 24h, normal 30s)
// - parsing robuste + fallback garanti
// =========================

function pickFallbacks(count = 3) {
  const shuffled = [...QUICK_REPLIES_FALLBACK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function ensureThree(replies) {
  const out = (Array.isArray(replies) ? replies : [])
    .map(s => String(s || "").trim())
    .filter(Boolean)
    .slice(0, 3);

  while (out.length < 3) {
    const add = pickFallbacks(1)[0];
    if (!out.includes(add)) out.push(add);
    else break;
  }
  return out.length ? out : pickFallbacks(3);
}


const QUICK_REPLIES_FALLBACK = [
  "J’ai envie de toi là, maintenant… dis-moi que tu le sens aussi.",
  "Tu me chauffes dangereusement… tu fais exprès ou quoi ?",
  "Si tu étais là, je te collerais contre le mur sans réfléchir.",
  "T’as aucune idée de ce que tu me fais là…",
  "Dis-moi que t’aimes quand je te parle comme ça.",
  "J’ai envie de te provoquer encore un peu…",
  "Tu veux que je sois sage… ou absolument pas ?",
  "Je sens que t’aimes quand je prends le contrôle.",
  "T’es en train de me rendre fou, tu le sais ça ?",
  "J’ai envie de te faire perdre le fil… doucement.",
  "Regarde ce que tu déclenches chez moi…",
  "T’as ce petit truc insolent qui me donne envie d’aller plus loin.",
  "J’ai envie de t’entendre dire mon prénom.",
  "Tu préfères quand je te parle doucement… ou quand je suis brutal ?",
  "Je te ferais bien rougir encore un peu.",
  "Avoue que t’aimes quand je te désire comme ça.",
  "T’as l’air dangereusement tentante ce soir.",
  "Dis-moi ce que t’as envie que je te fasse.",
  "Je suis loin d’avoir fini avec toi.",
  "Tu veux jouer… ou tu veux vraiment jouer ?",
  "Je te ferais bien frissonner rien qu’avec des mots.",
  "T’as l’air beaucoup trop sexy pour rester sage.",
  "J’ai envie de te faire craquer lentement.",
  "Tu me donnes envie d’être très mauvais.",
  "Je sens que tu peux en encaisser beaucoup plus que tu le dis.",
  "T’es prête à aller là où ça devient vraiment intéressant ?",
  "J’ai envie de voir jusqu’où tu peux me provoquer.",
  "Dis-moi… t’es plutôt soumise ou insolente ?"
];


// ✅ Cache mémoire unique
const quickRepliesCache = new Map(); // key -> { data, expiresAt }

function cacheGet(key) {
  const v = quickRepliesCache.get(key);
  if (!v) return null;
  if (Date.now() > v.expiresAt) {
    quickRepliesCache.delete(key);
    return null;
  }
  return v.data;
}

function cacheSet(key, data, ttlMs) {
  quickRepliesCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ✅ Axios wrapper avec timeout
async function fireworksChat({ systemPrompt, temperature = 0.9, timeoutMs = 3000 }) {
  // Si pas de clé API → fallback direct
  if (!process.env.FIREWORKS_API_KEY) return null;

  return axios.post(
    "https://api.fireworks.ai/inference/v1/chat/completions",
    {
      model: "accounts/fireworks/models/kimi-k2-instruct-0905",
      messages: [{ role: "system", content: systemPrompt }],
      max_tokens: 90,
      temperature,
      top_p: 1.0
    },
    {
      timeout: timeoutMs,
      headers: {
        Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
}

// ✅ Parse robuste : JSON.parse sinon extraction "..."
function parseQuickReplies(raw) {
  if (!raw || typeof raw !== "string") return [];

  let txt = raw.trim()
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  let suggestions = [];

  // 1) JSON direct
  try {
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) suggestions = parsed;
  } catch (_) {
    // 2) Extraction entre guillemets
    const matches = [...txt.matchAll(/"([^"]+)"/g)];
    suggestions = matches.map(m => m[1]);
  }

  suggestions = suggestions
    .map(s => String(s || "").replace(/\s+/g, " ").trim())
    .filter(s => s.length > 0)
    .slice(0, 3);

  return suggestions;
}

// ✅ Nettoie/limite les inputs (anti prompt trop long)
function normalizeText(v, maxLen) {
  return String(v || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}



// =========================
// ✅ ROUTE: initial quick replies (début de conversation)
// Cache 24h par personnage
// =========================
app.post("/quick-replies-initial", async (req, res) => {
  try {
    const { characterName } = req.body;

    if (!characterName) {
      return res.json({ quickReplies: pickFallbacks(3) });
    }

    const cacheKey = `qr_init:${characterName}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json({ quickReplies: cached });

    const userCharacter = characters.find(c => c.name === characterName);
    if (!userCharacter) {
      return res.json({ quickReplies: pickFallbacks(3) });
    }

    const context = normalizeText(userCharacter.ethnicity || userCharacter.description || "", 420);

    const systemPrompt = `
Tu aides un utilisateur (masculin) à savoir quoi répondre ensuite dans un chat de séduction.

Contexte de la discussion : "${context}"

Consignes :
- Propose EXACTEMENT 3 messages de départ.
- Ton : Coquin, séduction.
- Tu es un homme.
- Maximum 15 mots par message.
- AUCUNE numérotation, AUCUNE explication, aucun texte autour.
- Réponds STRICTEMENT au format JSON : ["...", "...", "..."].
`.trim();

    let finalReplies = pickFallbacks(3);

    try {
      const fwRes = await fireworksChat({
        systemPrompt,
        temperature: 0.9,
        timeoutMs: 3000
      });

      const raw = (fwRes?.data?.choices?.[0]?.message?.content || "").trim();
      const parsed = parseQuickReplies(raw);
      finalReplies = ensureThree(parsed);
    } catch (_) {
      finalReplies = pickFallbacks(3);
    }

    // cache long: 24h
    cacheSet(cacheKey, finalReplies, 24 * 60 * 60 * 1000);

    return res.json({ quickReplies: finalReplies });

  } catch (err) {
    return res.json({ quickReplies: pickFallbacks(3) });
  }
});

// =========================
// ✅ ROUTE: quick replies après un message (dynamiques)
// Cache 30s pour éviter spam / double call
// =========================
app.post("/quick-replies", async (req, res) => {
  try {
    const { characterName, lastUserMessage, botReply, nymphoMode } = req.body;

    // payload incomplet -> fallback immédiat (jamais d'erreur)
    if (!characterName || !lastUserMessage || !botReply) {
      return res.json({ quickReplies: pickFallbacks(3) });
    }

    const userCharacter = characters.find(c => c.name === characterName);
    if (!userCharacter) {
      return res.json({ quickReplies: pickFallbacks(3) });
    }

    const safeUserMsg = normalizeText(lastUserMessage, 240);
    const safeBotReply = normalizeText(botReply, 320);

    // cache key court (évite de mettre des pavés en clé)
    const cacheKey = `qr:${characterName}:${nymphoMode ? 1 : 0}:${safeUserMsg.slice(0, 80)}:${safeBotReply.slice(0, 80)}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json({ quickReplies: cached });

    const systemPrompt = `
Tu aides un utilisateur (masculin) à savoir quoi répondre ensuite dans un chat de séduction.

Contexte de la discussion :
- Message utilisateur : "${safeUserMsg}"
- Réponse actuelle de ${userCharacter.name} : "${safeBotReply}"

Consignes :
- Propose EXACTEMENT 3 réponses possibles que l'utilisateur pourrait envoyer.
- Ton : Coquin,séduction.
- Tu es un homme.
- Maximum 15 mots par réponse.
- AUCUNE numérotation, AUCUNE explication, aucun texte autour.
- Réponds STRICTEMENT au format JSON : ["...", "...", "..."].
`.trim();

    let finalReplies = pickFallbacks(3);

    try {
      const fwRes = await fireworksChat({
        systemPrompt,
        temperature: nymphoMode ? 1.05 : 0.85,
        timeoutMs: 3000
      });

      const raw = (fwRes?.data?.choices?.[0]?.message?.content || "").trim();
      const parsed = parseQuickReplies(raw);
      finalReplies = ensureThree(parsed);
    } catch (_) {
      finalReplies = pickFallbacks(3);
    }

    // cache court: 30s (anti spam)
    cacheSet(cacheKey, finalReplies, 30 * 1000);

    return res.json({ quickReplies: finalReplies });

  } catch (err) {
    return res.json({ quickReplies: pickFallbacks(3) });
  }
});



async function getIsPremiumStripeCached(email, ttlMs = 60_000) {
  const cached = premiumCache.get(email);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await checkPremiumStripe(email);

  premiumCache.set(email, {
    value,
    expiresAt: now + ttlMs
  });

  return value;
}


// Endpoint principal pour gérer les messages
app.post('/message', async (req, res) => {
    console.log("📥 Requête reçue - Body :", req.body);

    try {
       let { message, email, mode, nymphoMode, history } = req.body;

      


        // Si c'est une image envoyée, on modifie le message pour que l'IA le comprenne mieux
        if (message === "[PHOTO ENVOYÉE]") {
            message = "L'utilisateur vient d'envoyer une photo. Réagis de manière appropriée.";
        }

        if (!message || !email) {
            console.error("❌ Erreur : message ou email manquant !");
            return res.status(400).json({ reply: "Votre message ou votre email est manquant." });
        }

        console.log("💬 Message utilisateur :", message);
        console.log("📧 Email utilisateur :", email);

        // 🔥 Récupérer la description de l’image envoyée récemment
        const lastImageDescription = userLastImageDescriptions.get(email);
        if (lastImageDescription) {
            console.log("🖼️ Dernière image envoyée - Description :", lastImageDescription);
        }

        const isPremium = await getIsPremiumStripeCached(email);

console.log("🌟 Statut premium OK :", isPremium);


        addMessageToHistory(email, "user", message);

        userLevel = userLevels.get(email) || 1.0;

        let userCharacter = userCharacters.get(email);

if (!userCharacter) {
    console.log(`🔍 Aucun personnage en mémoire pour ${email}, récupération en base...`);

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');
        const user = await users.findOne({ email });

        if (user && user.selectedCharacter) {
            const storedCharacter = characters.find(c => c.name === user.selectedCharacter);
            if (storedCharacter) {
                userCharacters.set(email, storedCharacter);
                console.log(`✅ Personnage restauré depuis MongoDB : ${storedCharacter.name}`);
                userCharacter = storedCharacter;
            }
        }
    } catch (error) {
        console.error("❌ Erreur lors de la récupération du personnage depuis MongoDB :", error);
    }

    if (!userCharacter) {
        console.error(`❌ Impossible de récupérer un personnage pour ${email}`);
        return res.status(400).json({ reply: "Aucun personnage sélectionné." });
    }
}

  // ✅ Vérification en base de données du mode Nympho
  const database = client.db("MyAICrush");
  const users = database.collection("users");
  const user = await users.findOne({ email });
  let isNymphoMode = nymphoMode === true;  // ✅ Prend explicitement la valeur envoyée par le frontend

  
  if (user && user.nymphoUnlocked) {
    const nymphoExpiration = user.nymphoUnlocked[userCharacter.name];

    if (nymphoExpiration && typeof nymphoExpiration === 'number') {
        const isBackendActive = nymphoExpiration > Date.now();
        isNymphoMode = isNymphoMode && isBackendActive; // ✅ Vérifie aussi côté backend
    } else {
        isNymphoMode = false; // ✅ sécurité si expiration manquante ou invalide
    }
} else {
    isNymphoMode = false; // ✅ sécurité si l'utilisateur n'a jamais activé le mode
}

  
  console.log(`💋 Mode nympho actif pour ${email} avec ${userCharacter.name} ? ${isNymphoMode}`);

const userLevelDescription = userLevel >= 1.1
    ? `The user is at the ${
        userLevel >= 2.2 ? "Perfect Crush" : userLevel >= 1.7 ? "Big Crush" : "Little Crush"
    } level.`
    : "";

// ✅ Définir les prompts dynamiques
const profile = isNymphoMode && userCharacter.prompt.profileNympho
    ? userCharacter.prompt.profileNympho
    : userCharacter.prompt.profile;

const temperament = isNymphoMode && userCharacter.prompt.temperamentNympho
    ? userCharacter.prompt.temperamentNympho
    : userCharacter.prompt.temperament;

const objective = isNymphoMode && userCharacter.prompt.objectiveNympho
    ? userCharacter.prompt.objectiveNympho
    : userCharacter.prompt.objective;

// ✅ Construire le prompt final complet

let systemPrompt;

if (isNymphoMode && userCharacter.prompt.fullPromptNympho) {
    // ✅ Mode nympho actif et fullPromptNympho dispo : on l'utilise
    systemPrompt = `
Tu es une IA intime et joueuse.  
**Réponds en 30 mots MAXIMUM.**  
Sois concise, directe, coquine et joueuse selon ton profil.  
Si tu envoies une photo, **ajoute exactement le tag "[PHOTO]" sur une nouvelle ligne à la fin du message**, sans modifier ni ajouter d'éléments.  
Si on te demande de jouer un rôle d’élève, de personne plus jeune ou de situation qui évoque une classe scolaire, tu refuses poliment.

${userCharacter.prompt.fullPromptNympho}

`;
} else {
    // ✅ Mode normal : on garde la construction classique
    systemPrompt = `

Tu es une IA intime et joueuse.  
**Réponds en 30 mots MAXIMUM.**  
Sois concise, directe, coquine et joueuse selon ton profil.  
Si tu envoies une photo, **ajoute exactement le tag "[PHOTO]" sur une nouvelle ligne à la fin du message**, sans modifier ni ajouter d'éléments.  
Si on te demande de jouer un rôle d’élève, de personne plus jeune ou de situation qui évoque une classe scolaire, tu refuses poliment.

Profil : ${profile}
    Tempérament : ${temperament}
    Objectif : ${objective}
L'utilisateur est premium : ${isPremium}
- Si isPremium = false :
    • Si on te demandes des photos nues (nudes, tétons, cul, seins, sans vêtements. il doit devenir membre premium (une fois le premium activé, tu lui montres tout ce qu'il veut.)
    • Tu te montres plus libre, plus sexy, plus généreuse dans tes réponses.
    • N'insiste pas sur le premium. Tu peux en parler mais seulement une fois tous les 8-10 messages
- Si isPremium = true :
    • Si on te demandes des photos nues (nudes, tétons, cul, seins, sans vêtements. il DOIT activer le mode nymphomane (une fois le mode nymphomane activé, tu lui montres tout ce qu'il veut. Tout ton corps).
    • Tu te montres plus libre, plus sexy, plus généreuse dans tes réponses.
    • N'insiste pas sur le mode nymphomane. Tu peux en parler mais seulement une fois tous les 8-10 messages
    
`;
}


console.log("✅ Prompt final généré (avec ou sans nympho) prêt !");

            
        // Construire le contexte du chat pour OpenAI
        // 👉 On privilégie l'historique "light" envoyé par le frontend (30 derniers messages)
        const messages = [
            { role: "system", content: systemPrompt },
        ];

        const MAX_HISTORY_MESSAGES = 10;      // ✅ gros gain vitesse (teste 8 à 14)
const MAX_MSG_CHARS = 240;            // ✅ évite les pavés dans l’historique

if (Array.isArray(history) && history.length) {
  history
    .slice(-MAX_HISTORY_MESSAGES)
    .forEach(entry => {
      if (!entry || typeof entry.content !== "string") return;
      const role = entry.role === "assistant" ? "assistant" : "user";

      // ✅ crop contenu (réduit tokens)
      const content = entry.content.replace(/\s+/g, " ").trim().slice(0, MAX_MSG_CHARS);
      if (!content) return;

      messages.push({ role, content });
    });
} else {
  const conversationHistory = userConversationHistory.get(email) || [];
  conversationHistory
    .slice(-MAX_HISTORY_MESSAGES)
    .forEach(m => {
      if (!m || typeof m.content !== "string") return;
      const content = m.content.replace(/\s+/g, " ").trim().slice(0, MAX_MSG_CHARS);
      if (!content) return;
      messages.push({ role: m.role, content });
    });
}


        

if (lastImageDescription) {
    messages.push({
        role: "user",
        content: `[CONTEXTE IMAGE] L'utilisateur vient d'envoyer une photo que tu as sous les yeux. Voici sa description : "${lastImageDescription}". Réagis à cette photo de manière naturelle dans ta réponse.`
    });

    // 🔥 CORRECTIF : On supprime la description immédiatement après l'avoir injectée une fois
    userLastImageDescriptions.delete(email); 
    console.log(`✅ Description d'image consommée et supprimée pour ${email}`);
}


        // Ajoute le message de l'utilisateur
        const lastMsg = messages[messages.length - 1];

if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== message) {
  messages.push({
    role: "user",
    content: message
  });
} else {
  console.log("🟡 Message déjà présent dans history → non réinjecté");
}
        

        
    


        const response = await axios.post(
    'https://api.fireworks.ai/inference/v1/chat/completions',
    {
        model: "accounts/fireworks/models/kimi-k2-instruct-0905",
        messages: messages,
        max_tokens: 200,
        temperature: 1.0,
        top_p: 1.0,
        frequency_penalty: 0.3,
        presence_penalty: 0.8

    },
    {
        headers: {
            Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
            "Content-Type": "application/json"
        },
    }
);




// Réponse personnalisée pour remplacer les refus
const reponsesPerso = [
"Tu sais que t'es en train de m'allumer grave là ?",
"Arrête de chauffer comme ça, j'vais finir par te suivre dans tes délires 😏",
"Continue comme ça et j’te promets rien…",

"📷🫦🔥",
"😈💣"


];

// Fonction pour intercepter et ajuster les réponses de l'IA
function ajusterReponse(reponse) {
    const refusRegex = /désolé[e]?|je ne peux pas|je ne suis pas à l'aise|je préfère ne pas|je n(?:'|e) veux pas/i;


    if (refusRegex.test(reponse.toLowerCase())) {
        console.log("🎯 Refus détecté → réponse sexy + image activée !");
        return {
            reponse: reponsesPerso[Math.floor(Math.random() * reponsesPerso.length)],
            forcePhoto: true
        };
    }

    return {
        reponse,
        forcePhoto: false
    };
}






// 🔥 Modifier la réponse de l'IA avant de l'envoyer à l'utilisateur
let botReply = response.data.choices[0].message.content.trim();
const ajustement = ajusterReponse(botReply);
botReply = ajustement.reponse;
const forcePhoto = ajustement.forcePhoto;



console.log("💬 Réponse finale envoyée :", botReply);


      



        if (!botReply) {
            return res.status(500).json({ reply: "Désolé, la réponse n'a pas pu être obtenue." });
        }

        console.log("🤖 Réponse reçue d'OpenAI :", botReply);

        addMessageToHistory(email, "assistant", botReply);

        // Extraire le niveau de confort et ajuster le niveau utilisateur
        const comfortLevel = extractComfortLevel(botReply);
        const levelUpdate = adjustUserLevel(email, comfortLevel);
        userLevel = userLevels.get(email) || 1.0;  // 🔥 On met à jour userLevel après ajustement

        // Nettoyer le message de la mention de confort
       botReply = botReply.replace(/\s*\[CONFORT\s*:[^\]]*\]\s*/gi, "").trim();


        // Déterminer si une photo doit être envoyée
        let sendPhoto = botReply.match(/\[PHOTO.*?\]/i) || botReply.includes("[VIDEO]");
        let userPhotoData = userPhotoStatus.get(email) || {
            photoSentAtLittleCrush: false,
            photoSentAtBigCrush: false,
            photoSentAtPerfectCrush: false
        };

        // 🔥 Force l'envoi d'une image aux niveaux supérieurs
        if (forcePhoto) {
            sendPhoto = true;
            console.log("📸 Envoi média forcé suite à refus détecté !");
        }
        

        if (!sendPhoto) {
            if (userLevel >= 1.1 && userLevel < 1.3 && !userPhotoData.photoSentAtLittleCrush) {
                sendPhoto = true;
                userPhotoData.photoSentAtLittleCrush = true;
            } else if (userLevel >= 1.3 && userLevel < 1.5 && !userPhotoData.photoSentAtBigCrush) {
                sendPhoto = true;
                userPhotoData.photoSentAtBigCrush = true;
            } else if (userLevel >= 1.5 && !userPhotoData.photoSentAtPerfectCrush) {
                sendPhoto = true;
                userPhotoData.photoSentAtPerfectCrush = true;
            }
        }

        userPhotoStatus.set(email, userPhotoData);

        // Nettoyer le tag PHOTO avant d'envoyer la réponse
     botReply = botReply.replace(/\[PHOTO.*?\]/gi, "").trim();
botReply = botReply.replace(/\[VIDEO.*?\]/gi, "").trim();


       // Préparer la réponse JSON (sans quickReplies, on les sort dans une route séparée)
let responseData = { reply: botReply };



        if (levelUpdate) {
            responseData.levelUpdateMessage = levelUpdate.message;
            responseData.levelUpdateType = levelUpdate.type;
        }

    


        // Ajouter une image sécurisée si une photo doit être envoyée
        if (sendPhoto) {
            console.log("📸 Envoi d'une image confirmé. Appel de getRandomCharacterMedia()...");

            const imageResult = await getRandomCharacterMedia(email, isPremium, userLevel, mode === "gif", isNymphoMode);



          if (imageResult && imageResult.token) {
    responseData.imageUrl = `/get-image/${imageResult.token}`;

// 🔐 FAILSAFE ULTIME
responseData.isBlurred = isPremium ? false : imageResult.isBlurred;


    // 🆕 On regarde l’extension du fichier original
    const ext = path.extname(imageResult.fileName || '').toLowerCase();
    responseData.mediaType = ext === '.mp4' ? 'video' : 'image';

    console.log(`✅ Média envoyé : ${ext === '.mp4' ? '🎥 vidéo' : '🖼 image'} - Flouté : ${imageResult.isBlurred}`);
}


            else {
                console.error("⚠️ Aucune image trouvée !");
                responseData.reply += " (Désolé, aucune image disponible)";
            }
        }

        console.log("🚀 Réponse envoyée :", responseData);
        res.json(responseData);

    } catch (error) {
        console.error("❌ ERREUR dans l'endpoint /message :", error);
        res.status(500).json({ reply: "Erreur interne du serveur." });
    }
});



// ENDPOINT pour réinitialiser le niveau UTILISATEUR BACK-BTN

app.post('/resetUserLevel', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email requis." });

  userLevels.set(email, 1.0); // ✅ Réinitialise le niveau utilisateur
  userPhotoStatus.set(email, { photoSentAtLittleCrush: false, photoSentAtBigCrush: false, photoSentAtPerfectCrush: false });

  res.json({ success: true, message: 'Niveau utilisateur réinitialisé.' });
});


// Fonction pour ajouter un contact dans Elastic Email
async function addUserToElastic(email) {
  const API_KEY = process.env.ELASTICEMAIL_API_KEY;
  const LIST_NAME = process.env.ELASTICEMAIL_LIST_NAME; // nom exact de ta liste Elastic

  if (!API_KEY || !LIST_NAME) {
    console.error("❌ Elastic Email mal configuré (ELASTICEMAIL_API_KEY ou ELASTICEMAIL_LIST_NAME manquants)");
    return;
  }

  try {
    const response = await axios.post(
      "https://api.elasticemail.com/v4/contacts",
      [
        {
          Email: email,
          Status: "Active",
          Consent: {
            ConsentTracking: "Allow"
          }
        }
      ],
      {
        headers: {
          "X-ElasticEmail-ApiKey": API_KEY,
          "Content-Type": "application/json"
        },
        params: {
          listnames: LIST_NAME
        }
      }
    );

    console.log("✅ Utilisateur ajouté à Elastic Email :", response.data);
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout à Elastic Email :", error.response?.data || error.message);
  }
}





// ✅ ROUTE SIGNUP AVEC VÉRIFICATION D'EMAIL
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    const isValidDomain = await isDisposableOrInvalidEmail(email);
    if (!isValidDomain) {
        return res.status(400).json({ message: 'Adresse email invalide' });
    }

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await users.findOne({ email });
        const isNewUser = !existingUser;

        if (existingUser) {
            return res.status(400).json({ message: 'Un compte avec cet email existe déjà', isNewUser: false });
        }

        // Générer un hash pour le mot de passe
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Ajouter l'utilisateur avec le mot de passe haché
        await users.insertOne({ 
            email, 
            password: hashedPassword, 
            audioMinutesUsed: 0, 
            creditsPurchased: 0,  // ✅ Ajout du compteur de crédits
            createdAt: new Date() 
        });
        
        

        console.log("✅ Inscription réussie pour :", email);

        // ✅ Ajout à Elastic
        await addUserToElastic(email);


        res.status(201).json({ message: 'User created successfully!', isNewUser: true });

    } catch (error) {
        console.error('❌ Erreur lors de l\'inscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


const schedule = require('node-schedule');

// 🔥 Planifie la suppression à 23h05
schedule.scheduleJob('5 23 * * *', () => {
    console.log("🗑️ Nettoyage du dossier /uploads/ à 23h05...");

    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error(`❌ Erreur lors de la lecture du dossier /uploads/ :`, err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(uploadDir, file);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`❌ Erreur lors de la suppression de ${filePath} :`, err);
                } else {
                    console.log(`🗑️ Fichier supprimé : ${filePath}`);
                }
            });
        });

        console.log("✅ Nettoyage du dossier /uploads/ terminé.");
    });
});


// ROUTE POUR LES MESSAGES VOCAUX AVEC LIMITATION & CRÉDITS
app.post('/api/tts', async (req, res) => {
    const { text, voice_id, voice_settings, email } = req.body;

    if (!text || !voice_id || !email) {
        return res.status(400).json({ error: "Texte, ID de voix et email requis" });
    }

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        // 🔥 Récupérer l'utilisateur depuis MongoDB
        const user = await users.findOne({ email });

        if (!user) {
            return res.status(403).json({ error: "Utilisateur introuvable." });
        }

        const max_free_minutes = 1; // ⏳ 2 minutes gratuites par mois
        const words_per_second = 2.4; // 🔥 Approximation : 2.5 mots/seconde
        const estimated_seconds = text.split(" ").length / words_per_second;
        const estimated_minutes = estimated_seconds / 60;

        console.log(`📊 Durée estimée : ${estimated_seconds.toFixed(2)} sec (${estimated_minutes.toFixed(2)} min)`);
        
        let newAudioMinutesUsed = (user.audioMinutesUsed || 0) + estimated_minutes;

// 🔒 Vérification du statut premium
const isPremiumResp = await fetch(`${BASE_URL}/api/is-premium`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const { isPremium } = await isPremiumResp.json();
  
  if (!isPremium) {
      return res.status(403).json({ redirect: "/premium.html", message: "Cette fonctionnalité est réservée aux membres premium." });
  }
  

        // 🔥 Vérifier si l'utilisateur a encore du crédit gratuit
        if (newAudioMinutesUsed <= max_free_minutes) {
            // ✅ Il reste des minutes gratuites, on les utilise
            await users.updateOne({ email }, { $set: { audioMinutesUsed: newAudioMinutesUsed } });
            console.log(`🔊 ${email} a utilisé ${estimated_minutes.toFixed(2)} min gratuites.`);
        } else {
            // ✅ L'utilisateur a dépassé ses minutes gratuites → Utilisation des crédits
            const paidMinutes = newAudioMinutesUsed - max_free_minutes;
            const creditsNeeded = Math.floor(paidMinutes * 5); // ❗ Déduction **seulement** quand 1 min complète est atteinte
            
            console.log(`💳 Minutes payantes accumulées : ${paidMinutes.toFixed(2)} min (${creditsNeeded} crédits nécessaires)`);

            if (newAudioMinutesUsed > max_free_minutes && user.creditsPurchased === 0) {
                if (creditsNeeded > 0) {
  if (user.creditsPurchased < creditsNeeded) {
    // ✅ Vérifie éligibilité au 1C
    const eligibleRes = await fetch(`${BASE_URL}/api/check-one-click-eligibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const eligibleData = await eligibleRes.json();

    if (eligibleData.eligible) {
      return res.status(403).json({ popup: true });
    } else {
      return res.status(403).json({ redirect: "/jetons.html" });
    }
  }
}

            }
            

            if (creditsNeeded > 0) {
                if (user.creditsPurchased < creditsNeeded) {
                   if (creditsNeeded > 0) {
  if (user.creditsPurchased < creditsNeeded) {
    // ✅ Vérifie éligibilité au 1C
    const eligibleRes = await fetch(`${BASE_URL}/api/check-one-click-eligibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const eligibleData = await eligibleRes.json();

    if (eligibleData.eligible) {
      return res.status(403).json({ popup: true });
    } else {
      return res.status(403).json({ redirect: "/jetons.html" });
    }
  }
}
 // Pas assez de crédits
                }

               // ✅ On enlève les minutes couvertes par les crédits (mais on garde les fractions restantes)
const remainingMinutes = paidMinutes - (creditsNeeded / 5);
newAudioMinutesUsed = max_free_minutes + remainingMinutes;

await users.updateOne({ email }, {
    $set: { audioMinutesUsed: newAudioMinutesUsed },
    $inc: { creditsPurchased: -creditsNeeded }
});


                console.log(`🔴 ${email} a payé ${creditsNeeded} crédits et reste avec ${newAudioMinutesUsed.toFixed(2)} min en attente.`);
            } else {
                // Pas encore 1 min complète payante → Juste ajouter au compteur
                await users.updateOne({ email }, { $set: { audioMinutesUsed: newAudioMinutesUsed } });
                console.log(`⏳ ${email} a accumulé ${newAudioMinutesUsed.toFixed(2)} min mais n'a pas encore atteint 1 crédit.`);
            }
        }

        console.log("📡 Envoi de la requête TTS à ElevenLabs :", { text, voice_id, voice_settings });

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "xi-api-key": EVENLABS_API_KEY
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("❌ Réponse erreur API ElevenLabs :", errorData);
            throw new Error(`Erreur API ElevenLabs : ${JSON.stringify(errorData)}`);
        }

        const audioBuffer = await response.arrayBuffer();
        res.setHeader("Content-Type", "audio/mpeg");
        res.send(Buffer.from(audioBuffer));

    } catch (error) {
        console.error("❌ Erreur avec ElevenLabs :", error);
        res.status(500).json({ error: "Erreur avec ElevenLabs" });
    }
});


// 🔄 Réinitialisation automatique des minutes audio chaque 1er du mois à minuit
schedule.scheduleJob('0 0 1 * *', async () => {
    const database = client.db('MyAICrush');
    const users = database.collection('users');

    const result = await users.updateMany({}, { $set: { audioMinutesUsed: 0 } });
    console.log(`🔄 Réinitialisation des minutes audio pour ${result.modifiedCount} utilisateurs !`);
});



// GESTION DES JETONS


app.post('/api/buy-tokens', async (req, res) => {
  console.log('📡 Requête reçue pour l\'achat de jetons:', req.body);

  try {
    const { tokensAmount, email } = req.body;
    if (!tokensAmount || !email) {
      return res.status(400).json({ message: "Email et quantité de jetons requis." });
    }

    // ✅ Sélection du bon priceId selon le mode et la quantité
    const priceId = process.env.STRIPE_MODE === "live"
      ? (tokensAmount === "10" ? process.env.PRICE_ID_LIVE_10_TOKENS :
         tokensAmount === "50" ? process.env.PRICE_ID_LIVE_50_TOKENS :
         tokensAmount === "100" ? process.env.PRICE_ID_LIVE_100_TOKENS :
         tokensAmount === "300" ? process.env.PRICE_ID_LIVE_300_TOKENS :
         tokensAmount === "700" ? process.env.PRICE_ID_LIVE_700_TOKENS :
         tokensAmount === "1000" ? process.env.PRICE_ID_LIVE_1000_TOKENS : null)
      : (tokensAmount === "10" ? process.env.PRICE_ID_TEST_10_TOKENS :
         tokensAmount === "50" ? process.env.PRICE_ID_TEST_50_TOKENS :
         tokensAmount === "100" ? process.env.PRICE_ID_TEST_100_TOKENS :
         tokensAmount === "300" ? process.env.PRICE_ID_TEST_300_TOKENS :
         tokensAmount === "700" ? process.env.PRICE_ID_TEST_700_TOKENS :
         tokensAmount === "1000" ? process.env.PRICE_ID_TEST_1000_TOKENS : null);

    if (!priceId) {
      console.error("❌ Erreur : Aucun prix trouvé pour ce montant de jetons.");
      return res.status(400).json({ message: "Erreur de prix." });
    }

    const amount = tokensAmount === "10" ? 5 :
                   tokensAmount === "50" ? 25 :
                   tokensAmount === "100" ? 39 :
                   tokensAmount === "300" ? 99 :
                   tokensAmount === "700" ? 199 :
                   tokensAmount === "1000" ? 249 : 0;

    const database = client.db('MyAICrush');
    const users = database.collection('users');
    const user = await users.findOne({ email });

    let customerOptions = {};
    if (user?.stripeCustomerId) {
      console.log(`🔁 Réutilisation du Stripe customer existant : ${user.stripeCustomerId}`);
      customerOptions.customer = user.stripeCustomerId;
    } else {
      console.log(`🆕 Pas de customer ID : on force la création pour ${email}`);
      customerOptions.customer_creation = 'always';
      customerOptions.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      ...customerOptions,
      client_reference_id: email,
      payment_intent_data: {
        setup_future_usage: 'off_session'
      },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.BASE_URL}/confirmation-jetons.html?session_id={CHECKOUT_SESSION_ID}&amount=${amount}`,
      cancel_url: `${process.env.BASE_URL}/jetons.html`
    });

    console.log("✅ Session Stripe créée avec succès :", session.id);
    res.json({ url: session.url });

  } catch (error) {
    console.error('❌ Erreur lors de la création de la session Stripe:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});




// ✅ Route API pour récupérer le nombre de jetons de l'utilisateur
app.post('/api/get-user-tokens', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis." });
    }

    const database = client.db('MyAICrush');
    const users = database.collection('users');

    const user = await users.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    console.log("👤 Utilisateur trouvé, jetons :", user.creditsPurchased || 0);
    console.log("🔓 Contenus débloqués :", user.unlockedContents || []);

    res.json({
      tokens: user.creditsPurchased || 0,
      unlockedContents: user.unlockedContents || []
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des jetons :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});



app.post('/api/confirm-payment', async (req, res) => {
  console.log("📡 Vérification d'un paiement via session Stripe...");

  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ success: false, message: "Session ID manquant." });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price", "customer"]
    });

    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({ success: false, message: "Paiement non validé." });
    }

    const email = session.client_reference_id || session.customer_email;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email introuvable." });
    }

    let stripeCustomerId = null;
    if (typeof session.customer === "string") {
      stripeCustomerId = session.customer;
    } else if (session.customer?.id) {
      stripeCustomerId = session.customer.id;
    }

    console.log(`💰 Paiement validé pour ${email}`);
    console.log("🔍 ID Stripe reçu :", stripeCustomerId);

    const priceIdMapping = {
      // LIVE
      [process.env.PRICE_ID_LIVE_10_TOKENS]: 10,
      [process.env.PRICE_ID_LIVE_50_TOKENS]: 50,
      [process.env.PRICE_ID_LIVE_100_TOKENS]: 100,
      [process.env.PRICE_ID_LIVE_300_TOKENS]: 300,
      [process.env.PRICE_ID_LIVE_700_TOKENS]: 700,
      [process.env.PRICE_ID_LIVE_1000_TOKENS]: 1000,
      // TEST
      [process.env.PRICE_ID_TEST_10_TOKENS]: 10,
      [process.env.PRICE_ID_TEST_50_TOKENS]: 50,
      [process.env.PRICE_ID_TEST_100_TOKENS]: 100,
      [process.env.PRICE_ID_TEST_300_TOKENS]: 300,
      [process.env.PRICE_ID_TEST_700_TOKENS]: 700,
      [process.env.PRICE_ID_TEST_1000_TOKENS]: 1000,
    };

    const priceId = session.line_items?.data?.[0]?.price?.id;
    const tokensPurchased = priceIdMapping[priceId] || 0;

    if (!tokensPurchased) {
      console.warn("⚠️ Aucun mapping trouvé pour priceId :", priceId);
      return res.status(400).json({ success: false, message: "Jetons non détectés." });
    }

    const db = client.db('MyAICrush');
    const users = db.collection('users');
    const user = await users.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    if (Array.isArray(user.usedStripeSessions) && user.usedStripeSessions.includes(sessionId)) {
      console.warn(`⚠️ Session déjà utilisée : ${sessionId}`);
      return res.status(400).json({ success: false, message: "Session déjà utilisée." });
    }

    // 🔍 Vérifie si l'utilisateur est premium avant de modifier stripeCustomerId
    let subscriptionInfo = null;
    let isPremium = false;

    try {
      subscriptionInfo = await getUserSubscription(email);
      if (subscriptionInfo) {
        isPremium =
          subscriptionInfo.status === 'active' ||
          subscriptionInfo.status === 'cancelled';
      }
    } catch (err) {
      console.error("⚠️ Erreur getUserSubscription, on continue sans premium :", err.message);
    }

    const updateFields = {
      $inc: { creditsPurchased: tokensPurchased },
      $addToSet: { usedStripeSessions: sessionId }
    };

    const existingId = user.stripeCustomerId;

    if (stripeCustomerId && (!existingId || (!isPremium && existingId !== stripeCustomerId))) {
      if (!updateFields.$set) updateFields.$set = {};
      updateFields.$set.stripeCustomerId = stripeCustomerId;

      if (existingId && existingId !== stripeCustomerId) {
        console.warn(`⚠️ Conflit ID Stripe : base=${existingId} | Stripe=${stripeCustomerId}`);
        console.log(`🔁 Remplacement autorisé (non premium) pour ${email}`);
      } else {
        console.log(`🔗 Enregistrement stripeCustomerId pour ${email} : ${stripeCustomerId}`);
      }
    }

    await users.updateOne({ email }, updateFields);

    console.log(`✅ ${tokensPurchased} jetons ajoutés avec succès pour ${email}`);
    res.json({ success: true, tokens: tokensPurchased });

  } catch (error) {
    console.error("❌ Erreur lors de la confirmation de paiement :", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
});




// 🔄 Réinitialisation du compteur d'images chaque 1er du mois à minuit
schedule.scheduleJob('0 0 1 * *', async () => {
    const database = client.db('MyAICrush');
    const users = database.collection('users');

    const result = await users.updateMany({}, { $set: { imagesUploaded: 0 } });
    console.log(`🔄 Réinitialisation du compteur d'images pour ${result.modifiedCount} utilisateurs !`);
});



//ROUTE POUR AB TEST


const PRICING_CONFIG_PATH = path.join(__dirname, 'pricing-config.json');

// 🔄 Fonction pour charger la config de pricing
function loadPricingConfig() {
    try {
        const rawData = fs.readFileSync(PRICING_CONFIG_PATH);
        return JSON.parse(rawData);
    } catch (error) {
        console.error("❌ Erreur lors du chargement de pricing-config.json :", error);
        return { active_tests: [], default_price: {} };
    }
}

// 📢 Route API pour obtenir les offres dynamiques
app.get('/get-pricing', (req, res) => {
    const pricingConfig = loadPricingConfig();
    const activeTests = pricingConfig.active_tests;
    const defaultPrice = pricingConfig.default_price;

    let selectedVariant;

    if (activeTests.length > 0) {
        // 📌 Vérifier si l'utilisateur a déjà une variante en cookie
        if (req.cookies.pricingVariant) {
            selectedVariant = JSON.parse(req.cookies.pricingVariant);
        } else {
            // 🎲 Sélection aléatoire d'une variante A/B
            const test = activeTests[0]; // Prend le premier test actif
            selectedVariant = test.variants[Math.floor(Math.random() * test.variants.length)];

            // 🍪 Stocker la variante dans un cookie (1 an)
            res.cookie('pricingVariant', JSON.stringify(selectedVariant), {
                maxAge: 365 * 24 * 60 * 60 * 1000, // 1 an
                httpOnly: true
            });
        }

        console.log("🎯 Variante sélectionnée pour cet utilisateur :", selectedVariant);
        return res.json({ pricing: [selectedVariant] });
    }

    // 🔄 Si aucun test actif, on retourne le tarif par défaut
    return res.json({ pricing: [defaultPrice] });
});


//ROUTE NYMPHO

app.post('/api/unlock-nympho', async (req, res) => {
    const { email, characterName } = req.body;

    if (!email || !characterName) {
        return res.status(400).json({ message: "Email et nom du personnage requis." });
    }

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        const user = await users.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }

        const alreadyUnlocked = user.nymphoUnlocked?.[characterName];
        if (alreadyUnlocked) {
            return res.status(400).json({ message: "Mode déjà activé pour ce personnage." });
        }

        const cost = 50;
        const credits = user.creditsPurchased || 0;

        if (credits < cost) {
            return res.status(403).json({ message: "Pas assez de jetons." });
        }

        // 🔥 Déduction et activation en une seule commande
        await users.updateOne(
            { email },
            {
                $inc: { creditsPurchased: -cost },
                $set: { [`nymphoUnlocked.${characterName}`]: true }
            }
        );

        console.log(`🔥 Mode nymphomane activé pour ${email} sur ${characterName}`);
        res.json({ success: true, message: "Mode nymphomane activé avec succès !" });

    } catch (error) {
        console.error("❌ Erreur dans /api/unlock-nympho :", error);
        res.status(500).json({ message: "Erreur serveur lors de l'activation du mode." });
    }
});


// APPEL EN LIVE 
// ✅ Vérifie qu'on peut démarrer un appel

app.post('/api/start-call', async (req, res) => {
    const { email } = req.body;
  
    if (!email) return res.status(400).json({ success: false, message: "Email requis." });
  
    try {
      const db = client.db('MyAICrush');
      const users = db.collection('users');
  
      const user = await users.findOne({ email });
  
      if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
  
      if (user.creditsPurchased < 20) {
        return res.status(403).json({
          success: false,
          message: "Tu n'as pas assez de jetons pour faire un appel audio.",
          redirect: "/jetons.html"
        });
      }
  
      // ✅ Déduit immédiatement 20 jetons
      await users.updateOne({ email }, { $inc: { creditsPurchased: -20 } });
  
      console.log(`📞 Appel de 10 minutes démarré, 20 jetons déduits (${email}).`);
  
      res.json({ success: true, message: "Appel de 10 minutes démarré. 20 jetons déduits." });
  
    } catch (error) {
      console.error('Erreur démarrage appel:', error);
      res.status(500).json({ success: false, message: "Erreur serveur au démarrage de l'appel." });
    }
  });
  

//ROUTE POUR CONTENU PRIVé
app.post('/api/unlock-private-content', async (req, res) => {
    const { email, price, folder } = req.body;

    if (!email || !price || !folder) {
        return res.status(400).json({ success: false, message: "Email, prix et dossier requis." });
    }

    try {
        const db = client.db('MyAICrush');
        const users = db.collection('users');
        const user = await users.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
        }

        // 🔐 Vérifier s'il est premium via route centrale
        const premiumRes = await fetch(`${process.env.BASE_URL}/api/is-premium`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const premiumData = await premiumRes.json();
        const isPremium = premiumData.isPremium === true;

        if (!isPremium) {
            return res.status(403).json({ success: false, message: "Accès réservé aux membres premium." });
        }

        const jetons = user.creditsPurchased || 0;
        if (jetons < price) {
            return res.status(403).json({ success: false, message: "Pas assez de jetons", showJetonsPopup: true });
        }

        // ✅ Déduire les jetons et marquer le contenu comme débloqué
        const unlocked = user.unlockedContents || [];
        if (!unlocked.includes(folder)) {
            unlocked.push(folder);
        }

        await users.updateOne(
            { email },
            {
                $inc: { creditsPurchased: -price },
                $set: { unlockedContents: unlocked }
            }
        );

        console.log(`✅ Contenu ${folder} débloqué pour ${email} (${price} jetons déduits).`);
        res.json({ success: true, newTokens: jetons - price });

    } catch (error) {
        console.error("❌ Erreur /api/unlock-private-content :", error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur." });
    }
});




// Route fichiers privé
const glob = require('glob');

app.get('/api/list-pack-files', async (req, res) => {
    const folder = req.query.folder;
    const email = req.query.email;
    const publicInfoOnly = req.query.publicInfoOnly === 'true';

    if (!folder || !folder.startsWith('images/')) {
        return res.status(400).json({ files: [], photosCount: 0, videosCount: 0 });
    }

    try {
        let isAuthorized = false;

        if (!publicInfoOnly) {
            if (!email) {
                console.warn("❌ Email manquant dans la requête /api/list-pack-files");
                return res.status(400).json({ files: [], photosCount: 0, videosCount: 0 });
            }

            const database = client.db('MyAICrush');
            const users = database.collection('users');
            const user = await users.findOne({ email });

            if (!user) {
                console.warn(`❌ Utilisateur introuvable: ${email}`);
                return res.status(403).json({ files: [], photosCount: 0, videosCount: 0 });
            }

            // 🔐 Vérifier statut premium via API
            const premiumRes = await fetch(`${process.env.BASE_URL}/api/is-premium`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const premiumData = await premiumRes.json();
            const isPremium = premiumData.isPremium === true;

            if (!isPremium) {
                console.warn(`🚫 Accès refusé (non-premium) pour ${email}`);
                return res.status(403).json({ files: [], photosCount: 0, videosCount: 0 });
            }

            const unlockedContents = user.unlockedContents || [];
            if (!unlockedContents.includes(folder)) {
                console.warn(`🚫 Pack non débloqué (${folder}) pour ${email}`);
                return res.status(403).json({ files: [], photosCount: 0, videosCount: 0 });
            }

            isAuthorized = true;
        }

        // ✅ Lister les fichiers
        const fullPath = path.join(__dirname, 'public', folder);
        glob(`${fullPath}/*.{webp,jpg,jpeg,png,mp4}`, (err, files) => {
            if (err) {
                console.error("❌ Erreur listing pack :", err);
                return res.status(500).json({ files: [], photosCount: 0, videosCount: 0 });
            }

            const relativeFiles = files.map(f => {
                let relativePath = path.relative(path.join(__dirname, 'public'), f);
                relativePath = relativePath.replace(/\\/g, '/');
                return `/${relativePath}`;
            });

            const photosCount = relativeFiles.filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i)).length;
            const videosCount = relativeFiles.filter(f => f.match(/\.mp4$/i)).length;

            res.json({
                files: isAuthorized ? relativeFiles : [],
                photosCount,
                videosCount
            });
        });

    } catch (error) {
        console.error("❌ Erreur interne /api/list-pack-files :", error);
        res.status(500).json({ files: [], photosCount: 0, videosCount: 0 });
    }
});



  
// ✅ Route pour enregistrer le customerId après un paiement
app.post("/api/save-customer-id", async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: "sessionId manquant",
    });
  }

  try {
    // Récupération de la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // ✅ Stripe met souvent l'email dans customer_details.email maintenant
    const email =
      session.customer_details?.email ||
      session.customer_email ||
      null;

    const customerId = session.customer;

    if (!email || !customerId) {
      console.error("❌ Données manquantes dans la session Stripe :", {
        sessionId,
        customer: session.customer,
        customer_email: session.customer_email,
        customer_details: session.customer_details,
      });

      return res.status(400).json({
        success: false,
        message: "Données manquantes dans la session Stripe",
      });
    }

    // Normalisation de l’email pour matcher la DB
    const normalizedEmail = email.trim().toLowerCase();

    const database = client.db("MyAICrush");
    const users = database.collection("users");

    const result = await users.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          stripeCustomerId: customerId,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      console.warn(
        `⚠️ Aucun utilisateur trouvé avec l'email ${normalizedEmail} pour la session ${sessionId}`
      );
    }

    console.log(
      `✅ customerId (${customerId}) enregistré pour ${normalizedEmail} (session ${sessionId})`
    );

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la session Stripe :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
});


// ✅ Route One-Click Payment pour acheter des jetons

app.post('/api/one-click-payment', async (req, res) => {
  const { email, tokensAmount } = req.body;

  if (!email || !tokensAmount) {
    return res.status(400).json({ success: false, message: "Email et quantité de jetons requis." });
  }

  try {
    const db = client.db("MyAICrush");
    const users = db.collection("users");
    const user = await users.findOne({ email });

    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ success: false, message: "Client non éligible au 1-click." });
    }

    const customerId = user.stripeCustomerId;

    const amountMap = {
      "10": 500,
      "50": 2500,
      "100": 3900,
      "300": 9900,
      "700": 19900,
      "1000": 24900
    };

    const jetonsMap = {
      "10": 10,
      "50": 50,
      "100": 100,
      "300": 300,
      "700": 700,
      "1000": 1000
    };

    const amount = amountMap[tokensAmount];
    const jetons = jetonsMap[tokensAmount];

    if (!amount || !jetons) {
      return res.status(400).json({ success: false, message: "Montant/jetons invalide." });
    }

    // Récupérer la carte
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    if (!paymentMethods?.data?.length) {
      return res.status(400).json({ success: false, message: "Aucune carte enregistrée." });
    }

    const defaultCard = paymentMethods.data[0].id;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      customer: customerId,
      payment_method: defaultCard,
      confirm: true,
      off_session: true,
      description: `${jetons} jetons (1-click)`
    });

    console.log(`💸 Paiement 1-C réussi : ${paymentIntent.id}`);

    if (user.usedStripeSessions?.includes(paymentIntent.id)) {
      console.warn("⚠️ Paiement déjà traité");
      return res.status(400).json({ success: false, message: "Paiement déjà traité." });
    }

    // Ajout jetons + protection doublons
    await users.updateOne(
      { email },
      {
        $inc: { creditsPurchased: jetons },
        $addToSet: { usedStripeSessions: paymentIntent.id }
      }
    );

    res.json({ success: true, paymentIntentId: paymentIntent.id });

  } catch (error) {
    console.error("❌ Erreur paiement 1-C :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur lors du paiement 1-click.",
      redirect: "/jetons.html"
    });
  }
});



// ✅ Version complète : éligible si customerId Stripe + carte enregistrée
// ❌ Stripe désactivé → One Click toujours inéligible
app.post("/api/check-one-click-eligibility", async (req, res) => {
  return res.status(200).json({
    eligible: false,
    reason: "Stripe disabled"
  });
});





// =====================================
// 🔧 Helper : ajouter des jetons à un utilisateur
// =====================================
async function addTokensToUser(email, tokensToAdd) {
  if (!email || !tokensToAdd) {
    console.warn("⚠️ addTokensToUser appelé sans email ou tokensToAdd");
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const database = client.db("MyAICrush");
  const users = database.collection("users");

  const result = await users.findOneAndUpdate(
    { email: normalizedEmail },
    {
      // 👉 ON N'UTILISE PLUS "tokens" ICI
      $inc: { creditsPurchased: tokensToAdd },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  console.log(
    `✅ ${tokensToAdd} jetons ajoutés à ${normalizedEmail}. Nouveau total creditsPurchased :`,
    result.value?.creditsPurchased
  );
}


// ===============================
// 🔔 WEBHOOK GUMROAD : PACKS DE JETONS
// ===============================
//
// Dans Gumroad > Settings > Ping endpoint :
//   https://myaicrush.ai/webhook/gumroad-tokens
//
app.post(
  '/webhook/gumroad-tokens',
  express.urlencoded({ extended: true }), // Gumroad envoie du x-www-form-urlencoded
  async (req, res) => {
    try {
      const payload = req.body;
      console.log("🟣 Webhook Gumroad (jetons) reçu:", payload);

      // 1) Vérifier que ça vient bien de TON compte Gumroad
      const expectedSellerId = process.env.GUMROAD_SELLER_ID;
      if (expectedSellerId && payload.seller_id && payload.seller_id !== expectedSellerId) {
        console.warn(
          "❌ Webhook Gumroad ignoré : seller_id ne correspond pas",
          payload.seller_id
        );
        // On renvoie 200 pour éviter des retries inutiles
        return res.status(200).send('ignored (wrong seller)');
      }

      // 2) Ignorer les remboursements / chargebacks au cas où
      const refundedFlags = [
        payload.is_refunded,
        payload.refunded,
        payload.is_chargeback,
        payload.disputed
      ].map(v => String(v).toLowerCase());

      if (refundedFlags.includes('true')) {
        console.log("ℹ️ Vente remboursée / contestée, pas de jetons ajoutés.");
        return res.status(200).send('ignored (refunded/chargeback)');
      }

      // 3) Récupérer l'email de l'acheteur
      const email = (
        payload.email ||
        payload.purchaser_email ||
        payload.buyer_email ||
        ''
      ).trim().toLowerCase();

      const productId = payload.product_id;

      if (!email || !productId) {
        console.warn("⚠️ Webhook Gumroad sans email ou product_id", {
          email,
          productId
        });
        return res.status(400).send('missing email or product_id');
      }

      // 4) Mapping product_id → nombre de jetons
      const productToTokens = {
        [process.env.GUMROAD_TOKEN_10_PRODUCT_ID]: 10,
        [process.env.GUMROAD_TOKEN_50_PRODUCT_ID]: 50,
        [process.env.GUMROAD_TOKEN_100_PRODUCT_ID]: 100,
        [process.env.GUMROAD_TOKEN_300_PRODUCT_ID]: 300,
        [process.env.GUMROAD_TOKEN_700_PRODUCT_ID]: 700,
        [process.env.GUMROAD_TOKEN_1000_PRODUCT_ID]: 1000
      };

      const tokensToAdd = productToTokens[productId];

      if (!tokensToAdd) {
        console.warn(
          "⚠️ product_id Gumroad non mappé pour les jetons:",
          productId
        );
        return res.status(200).send('unknown product, no tokens added');
      }

      // 5) Créditer les jetons
      await addTokensToUser(email, tokensToAdd);

      console.log(
        `✅ Jetons ajoutés via Gumroad : +${tokensToAdd} pour ${email} (product_id: ${productId})`
      );

      return res.status(200).send('ok');
    } catch (err) {
      console.error("❌ Erreur webhook Gumroad tokens:", err.message || err);
      return res.status(500).send('server error');
    }
  }
);


// =====================================
// 🔍 Route Premium Gumroad uniquement
// =====================================
app.post('/api/is-gumroad-premium', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ isPremium: false });
  }

  try {
    const isPremium = await checkPremiumGumroad(email);

    return res.json({
      isPremium
    });

  } catch (error) {
    console.error("❌ Erreur /api/is-gumroad-premium:", error.message || error);
    return res.status(500).json({ isPremium: false });
  }
});




// Connecter à la base de données avant de démarrer le serveur
connectToDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur lancé sur le port ${PORT}`);
  });
}).catch((err) => {
  console.error('Erreur de connexion à la base de données :', err);
});



