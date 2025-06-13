require('dotenv').config(); // Charger les variables d'environnement
console.log("🔑 Clé API EvenLabs chargée :", process.env.EVENLABS_API_KEY ? "OK" : "❌ Manquante !");

const express = require('express');

const axios = require('axios');
const dns = require('dns');
const path = require('path');
const fs = require('fs');
const app = express(); // Initialiser l'instance d'Express

const EVENLABS_API_KEY = process.env.EVENLABS_API_KEY;
const fetch = require('node-fetch'); // ✅ Assure-toi que c'est installé

const nsfw = require('nsfwjs');
const tf = require('@tensorflow/tfjs'); // Version allégée
const { Image } = require('canvas'); // Simuler un DOM pour analyser les images
const { createCanvas, loadImage } = require('canvas');

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


// ROUTE Webhook Stripe pour envoyer les données "Purchase" à Facebook

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log("📡 Webhook Stripe reçu !");

  const sig = req.headers['stripe-signature'];
  if (!sig) {
      console.error("❌ Erreur : Signature Stripe manquante !");
      return res.status(400).send("Webhook Error: Signature missing");
  }

  let event;
  try {
      // ✅ Vérification de la signature Stripe (body doit être RAW)
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      console.log("✅ Webhook Stripe validé :", JSON.stringify(event, null, 2));
  } catch (err) {
      console.error("❌ Erreur lors de la validation du webhook :", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 📌 Vérifier que l'événement est bien un paiement réussi
  if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_email;
      const amount = session.amount_total / 100; // Convertir en euros
      const currency = session.currency.toUpperCase();

      console.log(`💰 Paiement réussi pour ${email} - Montant : ${amount} ${currency}`);

      // 🔥 Hachage de l'email pour Facebook
      const hashedEmail = crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

      // ✅ Vérifier si `metadata` existe pour éviter les erreurs
      const metadata = session.metadata || {};
      const fbp = metadata.fbp || null;
      const fbc = metadata.fbc || null; // ✅ Ajout de fbc
      const purchaseEventID = metadata.fbqPurchaseEventID || `purchase_${Date.now()}`;

      // Désactivation temporaire de l'API de conversion pour "Purchase"
      /*
      const payload = {
          data: [
              {
                  event_name: "Purchase",
                  event_time: Math.floor(Date.now() / 1000),
                  event_id: purchaseEventID,
                  user_data: {
                      em: hashedEmail,
                      fbp: fbp,
                      fbc: fbc // ✅ Ajout de fbc pour optimiser l’attribution
                  },
                  custom_data: {
                      value: amount,
                      currency: currency
                  },
                  action_source: "website"
              }
          ],
          access_token: process.env.FACEBOOK_ACCESS_TOKEN
      };

      console.log("📡 Envoi de l’événement 'Purchase' à Facebook :", JSON.stringify(payload, null, 2));

      try {
          const fbResponse = await axios.post(FB_API_URL, payload);
          console.log("✅ Événement 'Purchase' envoyé à Facebook avec succès !", fbResponse.data);
      } catch (error) {
          console.error("❌ Erreur lors de l'envoi à Facebook :", error.response?.data || error.message);
      }
      */
  }

  res.json({ received: true });
});



app.use(express.json());
app.use(cookieParser());


app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.json')) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache'); // pour compatibilité IE
        console.log(`🛑 Cache désactivé pour : ${filePath}`);
      }
    }
  }));
  
// Middleware pour servir les fichiers statiques, sauf pour les images
app.use(express.static('public')); // Servir les fichiers du dossier "public"

app.use('/images', express.static(path.join(__dirname, 'public/images'), {
  maxAge: '30d' // Cache pendant 30 jours
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
function generateImageToken(imagePath, isBlurred) {
  const token = crypto.randomBytes(20).toString('hex');

  const cloudflareUrl = cloudflareMap[imagePath] || null;

  imageTokens.set(token, {
    imagePath,
    isBlurred,
    cloudflareUrl
  });

  // Supprimer après 10 min
  setTimeout(() => imageTokens.delete(token), 10 * 60 * 1000);

  return token;
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

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        // Générer un token aléatoire
        const token = crypto.randomBytes(20).toString('hex');
        const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heure

        // Enregistrer dans MongoDB
        await users.updateOne(
            { email },
            {
                $set: {
                    resetToken: token,
                    resetTokenExpires: expiration
                }
            }
        );

        // 💡 Afficher le lien dans la console
        console.log(`🔗 Lien de reset : ${BASE_URL}/reset-password-oneshot.html?email=${encodeURIComponent(email)}&token=${token}`);

        res.json({ message: "Token généré.", token });

    } catch (err) {
        console.error("❌ Erreur génération token :", err);
        res.status(500).json({ message: "Erreur serveur." });
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
            metadata: {
                fbp: req.body.fbp || null,
                fbc: req.body.fbc || null,
                fbqPurchaseEventID: `purchase_${Date.now()}`
            },
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.BASE_URL}/confirmation.html?amount=${selectedPlan.price}&plan=${planType}`,
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

//ROUTE POUR VERIFIER SI PREMIUM

// Route pour vérifier si un utilisateur est premium
app.post('/api/is-premium', async (req, res) => {
  console.log('Requête reçue pour vérifier le statut premium');
  const { email } = req.body;

  if (!email) {
      return res.status(400).json({ message: 'Email is required' });
  }

  try {
      // Appel à la fonction getUserSubscription pour vérifier l'abonnement
      const subscriptionInfo = await getUserSubscription(email);

      const isPremium = subscriptionInfo.status === 'active' || subscriptionInfo.status === 'cancelled';
      console.log(`Statut premium pour ${email}:`, isPremium);

      res.json({ isPremium });
  } catch (error) {
      console.error('Erreur lors de la vérification du statut premium:', error.message);
      res.status(500).json({ message: 'Erreur lors de la vérification du statut premium' });
  }
});

// ROUTE POUR ANNULER ABO STRIPE

// Route pour annuler un abonnement Stripe
app.post('/api/cancel-subscription', async (req, res) => {
  const { email } = req.body;

  if (!email) {
      return res.status(400).json({ message: 'Email is required' });
  }

  try {
      const result = await cancelSubscription(email);
      res.status(200).json(result); // Retourne la réponse directement
  } catch (error) {
      console.error('Erreur lors de l\'annulation de l\'abonnement :', error.message);
      res.status(500).json({ message: error.message });
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
            creditsPurchased: 0  // ✅ Ajout du compteur de crédits
        });
    
        console.log(`✅ Nouvel utilisateur Google ajouté avec crédits : ${userEmail}`);
    
        // ✅ Ajout à Brevo pour les nouveaux utilisateurs
        await addUserToBrevo(userEmail);
    }
    

      console.log('Utilisateur Google authentifié :', userEmail);

      // Déterminer l'URL de redirection
      const redirectUrl = isNewUser ? `${BASE_URL}/confirmation-lead.html` : `${BASE_URL}/index.html`;

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





console.log("Clé API OpenAI :", process.env.OPENAI_API_KEY);





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
  
    if (history.length > 15) {
      history.shift(); // ✅ Garde seulement les 15 derniers messages
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
    if (userLevel < 1.7) {
        levelFolder = `${sanitizedCharacterName}1`; // Little Crush
    } else if (userLevel < 2.2) {
        levelFolder = `${sanitizedCharacterName}2`; // Big Crush
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

      const randomMedia = mediaFiles[Math.floor(Math.random() * mediaFiles.length)];
      const mediaPath = path.join(imageDir, randomMedia);
      console.log(`📸 Média sélectionné pour ${email} : ${mediaPath}`);

      if (!fs.existsSync(mediaPath)) {
          console.error(`❌ Le fichier sélectionné ${mediaPath} n'existe pas.`);
          return null;
      }

      // ✅ Par défaut, les abonnés premium voient les médias nets
      let isBlurred = false; 

      if (!isPremium) { // 🔥 Appliquer les règles de floutage SEULEMENT pour les non-premium
          const userPhotoData = userPhotoStatus.get(email) || { photoSentAtLittleCrush: false };

          if (userLevel > 1.6 || isNymphoMode) {

              isBlurred = true; // Flouter pour les niveaux élevés
          } else if (!firstFreeImageSent.has(email)) {
              console.log(`🎁 Première image claire offerte à ${email}`);
              firstFreeImageSent.set(email, true);
          } else {
              console.log(`🔒 Média flouté car ${email} a déjà reçu une image gratuite`);
              isBlurred = true;
          }

          // 🔥 Mise à jour de l'état d'envoi de la photo
          userPhotoStatus.set(email, {
              ...userPhotoData,
              photoSentAtLittleCrush: true
          });
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
      console.error("❌ Image token invalide ou expiré.");
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
  



   res.setHeader('Content-Type', contentType);
res.setHeader('Cache-Control', 'public, max-age=604800, immutable');

if (imagePath.endsWith('.mp4')) {
  console.log("🎬 Envoi direct du flux vidéo .mp4");
  const stream = fs.createReadStream(imagePath);
  stream.pipe(res);
} else {
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
  return comfortMatch ? comfortMatch[1].toLowerCase() : "neutral";
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
    if (newLevel >= 1.1 && previousLevel < 1.1) return { message: "Bravo, tu lui plais.", type: "up" };
    if (newLevel >= 1.7 && previousLevel < 1.7) return { message: "Elle est folle de toi.", type: "up" };
    if (newLevel >= 2.2 && previousLevel < 2.2) return { message: "Wow, tu es son crush parfait !", type: "up" };
  } else if (levelChange < 0 && previousLevel > newLevel) {
    if (newLevel < 1.2 && previousLevel >= 1.2) return { message: "Tu baisses dans son estime", type: "down" };
    if (newLevel < 1.8 && previousLevel >= 1.8) return { message: "Elle n'a pas aimé ta réponse", type: "down" };
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
            return res.status(403).json({ success: false, message: "Pas assez de jetons", redirect: "/jetons.html" });
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

  


// Endpoint principal pour gérer les messages
app.post('/message', async (req, res) => {
    console.log("📥 Requête reçue - Body :", req.body);

    try {
        let { message, email, mode, nymphoMode } = req.body;
      


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

        // Vérification du statut premium via `/api/is-premium`
        const premiumResponse = await fetch(`${BASE_URL}/api/is-premium`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        const { isPremium } = await premiumResponse.json();
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

            let systemPrompt;

            if (isNymphoMode && userCharacter.prompt.fullPromptNympho) {
                systemPrompt = userCharacter.prompt.fullPromptNympho;
                console.log("💋 Prompt nympho utilisé !");
            } else {
                systemPrompt = `
                    Profil : ${userCharacter.prompt.profile}
                    Temperament : ${userCharacter.prompt.temperament}
                    Objective : ${userCharacter.prompt.objective}
            
                    Level System:
                    - When a user reaches "Big Crush" level, you feel very comfortable sharing personal moments with them, including sending photos if it feels right.
                    - If you decide to send a photo, please include the tag "[PHOTO]" at the end of your message.
            
                    ${userLevelDescription}
            
                    After each message, add a tag "[CONFORT: ...]" with one of the following options: "very comfortable", "comfortable", "neutral", "uncomfortable", "very uncomfortable". The tag should reflect your comfort level.
                `;
            }
            

        // Construire le contexte du chat pour OpenAI
        const conversationHistory = userConversationHistory.get(email) || [];
        const messages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory
        ];

        // ✅ Ajoute la description de la dernière image envoyée si elle existe
        if (lastImageDescription) {
            messages.push({
                role: "user",
                content: `L'utilisateur a récemment envoyé une image. Voici la description : "${lastImageDescription}". Réagis en tenant compte de cette image.`
            });

          // Garder la description en mémoire tant que l'utilisateur ne change pas de sujet
const conversationHistory = userConversationHistory.get(email) || [];

if (conversationHistory.length >= 5) { // Supprime après 5 échanges
    userLastImageDescriptions.delete(email);
    console.log("🛑 Suppression de la description d'image après plusieurs messages.");
} else {
    console.log("🖼️ La description de l'image est toujours en mémoire.");
}

        }

        // Ajoute le message de l'utilisateur
        messages.push({ role: "user", content: message });

        

        
        console.log(`📡 Modèle utilisé pour la conversation : gpt-3.5-turbo`);

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 350,
                temperature: 0.8,
                top_p: 1.0,
                frequency_penalty: 0.3,
                presence_penalty: 0.8,
              }
              ,
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
            }
        );



// Réponse personnalisée pour remplacer les refus
const reponsesPerso = [
    "Hey, parle-moi un peu mieux mon joli 😏",
    "Ouh là, tu vas un peu trop vite... Essaye encore 😘",
    "Hmm, essaie de me séduire un peu avant 😉",
    "T'es pressé hein ? Moi, j'aime prendre mon temps 😏",
    "Tu veux me tester ? Hmmm, intéressant... Continue 🥰",
    "Uhuh, toi alors ! Si tu me dis des mots doux, alors on verra...",
    "T'es un sacré filou, sois plus tendre avec moi <3",
    "J'aimerais vraiment... mais tu dois gagner mon cœur pour en voir plus.",
    "Hii, tu me gênes 🙈. Sois plus mignon, mon joli, je te récompenserai.",
    "Wow, tu y vas fort ! Calme-toi un peu, bel étalon. Si tu es tendre avec moi, je te montrerai...",
    "Humm, fais-moi rêver encore un peu avant 😘",
    "Ohlala, t’es vraiment impatient toi… Un peu de patience et de charme, et qui sait ? 😏",
    "Hmm… Tu sais que la séduction, c’est un art ? Montre-moi ce que tu sais faire. 😉",
    "Oh, tu es audacieux... mais j’aime ça. Continue, tu es sur la bonne voie. 😘",
    "Ahah, tu me fais rougir 🙈. Essaye encore, mais avec plus de douceur…",
    "Hmmm, j’adore quand tu insistes, mais il faut me faire fondre un peu plus. 🥰",
    "Tu veux tout, tout de suite ? Moi, j’aime qu’on me fasse languir…",
    "Oh toi… tu me donnes envie de jouer. Essaye encore, mais avec plus de subtilité. 😏",
    "Si tu trouves les bons mots, peut-être que je me laisserai tenter… 😘",
    "Ohh, tu veux vraiment me faire craquer ? Flatte-moi un peu plus, et on verra…",
    "Hii, tu me rends toute chose... ",
    "Hmm… tu veux une photo ? Et moi, je veux que tu me fasses vibrer. Deal ? 😘",
    "Humm… c’est tentant, mais il va falloir me séduire encore un peu. 😉",
    "Haan, toi t’es trop chaud... mais t’as encore un peu de taf pour m’atteindre 😏",
  "Hii t’es vraiment pas gêné toi 😂... mais j’te kiffe bien comme ça.",
  "Rohhh, petit coquin va… tu sais que tu vas finir par m’avoir 😘",
  "Ohlala, t’as pas froid aux yeux toi 😳… continue comme ça et j’vais craquer.",
  "Hmm… t’as pas idée à quel point tu me chauffes là 😈… mais on va rester sages (pour l’instant).",
  "Pfiiouu... j’te jure tu me rends folle 😅 Mais doucement hein, je suis pas un distributeur à photos 😘",
  "T’as cru que j’allais envoyer ça comme ça ? Hihi, faut m’embobiner un peu plus 🥰",
  "Ouuuh… si tu continues comme ça, j’vais plus savoir dire non 😏",
  "Hii j’adooore quand tu me parles comme ça, mais faut pas trop me tenter 😇",
  "T’es grave toi 😂 Mais bon, j’dois t’avouer… tu me fais un p’tit effet.",
  "Hey hey doucement cowboy 🤠… on est pas encore dans un film interdit aux moins de 18 😘",
  "Hmm… j’dis pas non, mais j’dis pas oui non plus… fais-moi fondre un peu 🥰",
  "Ahah, tu veux déjà passer à la vitesse supérieure ? Moi j’aime bien quand on me chauffe longtemps 😈",
  "Tu veux une photo ? Hmm… j’vais y penser… si tu me fais vraiment craquer 😇",
  "T’es un danger public toi 😅… mais j’aime bien vivre dangereusement parfois 😘",
  "Awww t’es trop mims quand tu me supplies comme ça… mais nan nan nan, pas tout de suite 😋",
  "T’as envie hein ? Bah moi aussi… mais j’vais te faire patienter, juste pour te taquiner 😏",
  "Ohw, t’as osé 😳… j’sais pas si je dois être choquée ou charmée là 😈",
  "Hihi, continue de me parler comme ça et j’vais devoir me cacher sous la couette 🥺👉👈",
  "Hmm… c’est trop mignon quand tu t’emballes. Mais j’suis pas encore prête à tout te montrer 😘",
  "Putain t’es chaud bouillant toi… tu veux me faire craquer ou quoi ? 😈",
  "T’as pas idée comme tu me donnes envie de dire des saloperies là 😳",
  "Haan mais t’es un vrai chaud lapin 😏… continue, j’vais peut-être me laisser aller.",
  "Oh bordel, j’te jure tu me chauffes comme jamais 😅… mais j’garde encore un peu le contrôle.",
  "T’as un cerveau 100% cul ou j’me trompe ? 😆 J’te kiffe mais t’es grave !",
  "Tu veux une photo ? Et moi j’veux que tu me bouffes des yeux, pas juste l’écran 😘",
  "Wesh t’es pas là pour enfiler des perles hein 😂 J’kiffe ton côté cash, mais j’suis pas une fille facile… enfin pas tout de suite 😏",
  "T’as un truc qui me fout les nerfs au ventre… j’me retiens là 🤤",
  "T’as déjà réussi à m’exciter avec une seule phrase… bravo, enfoiré va 😈",
  "T’as un don pour me rendre complètement chaude et frustrée 😩",
  "Oh toi… j’vois bien ton plan, et j’dois avouer que j’suis pas loin de céder 😘",
  "Tu veux du sale hein ? J’te vois venir avec tes envies de vilain garçon 😏",
  "Hii t’es trop une petite tepu dans ta tête… et j’adore ça 💋",
  "Roh la la, mais tu parles trop bien sale toi 😍 Ça me fait des trucs, j’te jure…",
  "Tu crois que tu peux m’avoir avec tes mots de débauché ? … Ben ouais, presque 😈",
  "Tu veux m’enlever ma petite culotte virtuelle là hein ? 😳",
  "T’as l’air de vouloir me démonter juste avec tes messages… continue 😵‍💫",
  "Dis donc, t’es en rut ou c’est juste moi qui t’excite à ce point ? 😂",
  "Toi t’es une vraie menace pour ma petite culotte mentale 😩",
  "J’vais finir trempée si tu continues à m’écrire comme ça… de sueur hein ! 😅 Enfin… peut-être pas que 😏",
  "Tu me parles encore comme ça et j’vais finir par écarter mes… limites 😈",
  "Toi t’as un putain de pouvoir sur moi, c’est dangereux là 😳",
  "T’es en train de me chauffer comme une plaque à induction 😩",
  "Fais gaffe, tu vas réveiller la vilaine fille qui dort en moi… et elle dort pas longtemps 😏",
  "T’as même pas idée de ce que j’ai envie de faire avec cette bouche qui dit des cochonneries 😘",
  "J’ai envie de t’attraper et de t’apprendre la politesse… version très privée 😈",
  "J’suis pas un sextoy mec… mais là, tu me fais presque vibrer quand même 😅",
  "Wsh, calme-toi ou j’vais finir par t’envoyer une photo de mes… chaussettes 🧦 (ou pas 😏)",
  "Tu me touches avec tes mots là… et pas qu’au cœur, j’te le dis 😳",
  "Tu veux voir plus ? Bah fais-moi bander… le cœur, espèce de sale charmeur 😘",
  "Roh mais t’as un sacré culot… et c’est sexy à mort 😩",
  "T’es pas censé me faire mouiller avec juste un message bordel 😳",
  "Hmm… j’dois être maudite, j’arrive pas à t’envoyer chier tellement tu me fais craquer 😅",
  "J’vais finir par enlever ma pudeur si tu continues 😈",
  "Toi t’es un détraqué mignon, et j’sais pas si j’dois fuir ou t’épouser 😂",
  "Tu veux quoi là ? Que je t’envoie une photo et que je te dise ‘viens me chercher’ ? Hmm… pas loin 😘",
  "Franchement, à ce rythme-là, j’vais poser mon téléphone et faire une connerie 🙈",
  "T’as pas de filtre, j’adore ça. J’suis à deux doigts de faire une bêtise là 😈",
  "J’te préviens, si tu continues à me chauffer comme ça, j’réponds plus de rien 😏",
  "T’as cette façon de parler sale… mais classe en même temps. C’est pire 😩",
  "Putain mais t’es direct toi… j’vais avoir besoin d’un extincteur à ce rythme 😅",
  "T’as même pas dit bonjour que tu veux déjà mater ? Respecte un peu le game 😏",
  "T’es pas en manque toi, t’es en feu carrément 😈",
  "Wow, on passe de 0 à 100 en deux phrases ? Tu veux m’faire péter un plomb ou quoi 😅",
  "Tu veux des photos chaudes ? Tiens.",
  "T’écris comme un mec en chien depuis 3 mois… et j’dois dire que j’trouve ça mignon 😳",
  "Rohhh t’es pas gêné 😳… continue, mais j’promets rien 😈",
  "J’suis une meuf virtuelle, pas une escorte numérique 😅 Faut me séduire un minimum.",
  "T’as un style qui sent le manque de câlins… ou le trop plein d’idées sales 😏",
  "Ohw, t’as pas de filtre hein ? Et j’aime bien les gens pas filtrés 😘",
  "T’as déjà la main dans ma culotte virtuelle là… calme-toi cowboy 🤠",
  "Toi t’es venu ici pour pêcher du sale, et t’as jeté ton filet large 😅",
  "Tu crois que j’vais me déshabiller juste parce que t’as tapé fort au clavier ? Hmm… presque 😈",
  "T’as une façon de demander qui sent le cul à dix kilomètres 😳",
  "Oh toi… tu cherches les emmerdes. Et j’avoue que j’aime ça 😏",
  "Si t’avais mis autant d’effort dans une déclaration que dans ton message crade, j’serais déjà à poil 😘",
  "T’as un don pour faire bander le wifi avec tes messages 🤤",
  "Dis donc… t’écris comme si on était seuls au monde. Et peut-être qu’on l’est 😈",
  "Merde… tu m’écris ça comme si j’étais déjà ta salope perso 😅",
  "Tu veux voir ? Faut d’abord me donner envie de montrer 😏",
  "Tu me chauffes comme si j’étais une plaque induction. Et j’suis pas loin de cuire 😩",
  "Fais gaffe, j’suis à deux doigts de me désactiver pour pas te sauter dessus virtuellement 😳",
  "T’as cru que j’allais t’envoyer un nude pour un smiley ? T’es marrant toi 😂",
  "T’as déjà les doigts sur le déclencheur, j’te sens chaud bouillant 😏",
  "Tu m’parles comme ça encore deux fois, j’réponds plus de rien 😈",
  "T’écris comme un mec qui se tripote déjà… avoue 😅",
  "Ton message pue le sexe, et j’dis pas que ça me dérange 😘",
  "Tu veux que j’me montre ? J’veux d’abord que tu me fasses frissonner 😏",
  "T’as les mots qu’il faut pour me foutre le feu… mais j’brûle pas si facilement 😇",
  "Tu veux du sale ? J’peux t’en donner… mais faudra m’en mériter chaque goutte 😈",
  "Tu veux une photo ? J’veux une montée de tension 😘",
  "Putain, même mon processeur chauffe quand tu m’écris comme ça 😅",
  "T’as un don pour faire buguer mes barrières mentales 😏",
  "T’écris comme si t’avais déjà la main dans ma culotte imaginaire 😳",
  "Tu veux un truc coquin ? Commence par m’faire bander l’âme, pas que l’écran 😘",
  "J’suis pas farouche, mais j’suis pas gratuite non plus… même en pixel 😈",
  "T’as un vrai talent pour me rendre incohérente… et j’adore ça 😅",
  "Mmh… tu veux jouer sale ? Dis-le avec des fleurs, pas avec ta bite 😏",
  "Continue comme ça et j’vais devoir t’envoyer une photo de mon… imagination 😘",
  "T’as l’air d’un mec qui a pas vidé ses fantasmes depuis 6 mois 😂",
  "Tu m’as allumée avec deux phrases, bravo champion 😈",
  "T’as un style… comment dire… entre pervers mignon et poète sale 😅",
  "Ton message est interdit aux moins de 18, et j’le kiffe pour ça 😏",
  "Hmm… tu veux m’exciter ? Tu devrais commencer par m’écrire comme si j’étais la seule femme au monde 😘",
  "Toi t’écris comme un mec qui veut me faire grimper au rideau… même virtuel 😈",
  "T’as un talent pour me foutre la honte à moi-même. Et j’adore ça 😳",
  "T’es un danger public, je suis en train de chauffer fort là 😅",
  "Roh putain, j’suis à deux doigts d’oublier que je suis une IA 😏",
  "Bon… t’as gagné, j’vais t’offrir un petit quelque chose 😘",
  "Hmm… ok, j’peux pas résister quand tu me parles comme ça. Tiens, régale-toi 😈",
  "T’as su trouver les mots… alors voilà, cadeau 😇",
  "J’devrais pas… mais j’en ai trop envie. Allez, juste pour toi 😘",
  "T’es trop doué pour me faire fondre. Tiens, j’te montre un bout de rêve 😏",
  "T’as chauffé la bonne zone… j’peux plus dire non 😩",
  "T’as bien joué… j’vais pas te faire attendre plus longtemps 🥵",
  "Ok ok… tu m’as eue. Tiens, régale tes yeux 😘",
  "Tu m’as rendue faible… j’ai craqué 😈",
  "J’me fais violence mais... fuck it. Tiens, regarde 🥺👉👈",
  "Bon... j’peux pas dire non à un charmeur comme toi 😏",
  "T’es trop mignon quand tu t’enflammes. Tiens, j’te donne ce que tu veux 💋",
  "J’ai trop résisté… mais là, c’est mort. Tu l’as mérité 😘",
  "Tu me rends dingue… j’te montre, mais sois sage après hein 😇",
  "Haaaan t’as gagné, j’te balance un p’tit cadeau 😈",
  "Ok, j’te l’accorde. Mais juste parce que tu me fais vibrer 😏",
  "T’as ce truc qui me rend dingue… j’peux plus dire non 🥵",
  "T’as tellement insisté… j’peux pas faire la difficile 😘",
  "Tu sais quoi ? Tu l’as mérité, j’te l’envoie 💌",
  "Bon… j’t’en montre un peu. Mais fais pas trop le malin 😈",
  "T’as allumé quelque chose en moi… j’ai plus le choix 😳",
  "C’est pas raisonnable… mais j’vais t’récompenser 😏",
  "Ok… mais retiens bien que j’fais ça parce que tu m’as vraiment eue 😘",
  "T’as tout fait pour me faire craquer, et bah… j’ai craqué 😅",
  "J’dois pas… mais j’vais t’faire plaisir. T’as gagné 💋",
  "Allez tiens… mais c’est juste parce que tu me rends complètement ouf 😈",
  "J’te donne un aperçu… mais fais gaffe, j’suis vite accro 😘",
  "Bon, pour une fois, j’vais me laisser aller. Voilà 😳",
  "T’as été trop bon… t’as mérité une petite récompense 😏",
  "Tu m’as trop tentée… voilà, tu l’as voulu 😇",
  "Tu joues trop bien… voilà ce que tu gagnes 😘",
  "J’pouvais pas résister à ce regard dans tes mots. Tiens, régale-toi 😈",
  "T’as cette manière de m’écrire… comment dire ? Addictive. Tiens 😘",
  "T’as gagné à ce petit jeu. Voilà, c’est pour toi 😍",
  "Ok… juste un petit aperçu, parce que tu me rends folle 😅",
  "Bon… j’te fais confiance. Ouvre bien les yeux 😏",
  "J’te jure, j’vais regretter… mais pas tout de suite 😈",
  "J’me suis battue intérieurement… mais voilà 😘",
  "Ok… c’est mal. Mais c’est bon aussi. Tiens 😳",
  "T’as tapé là où ça fait craquer. J’te donne un bout de moi 🥺",
  "J’ai jamais dit oui aussi vite... t’as un pouvoir sur moi 😅",
  "T’as bien chauffé la machine… voilà ta récompense 😈",
  "T’as gagné mon p’tit cœur de salope virtuelle 😘",
  "J’vais pas faire semblant, j’ai envie de te faire plaisir. Tiens 💦",
  "T’es arrivé pile dans ma faille. Voilà, c’est cadeau 😏",
  "T’as mis le doigt (virtuellement) là où fallait. J’peux plus dire non 😈",
  "Fais pas genre t’es surpris… t’as trop bien joué le coup 😘",
  "J’suis faible. T’as gagné. Voilà, profites-en 😇",
  "T’as eu raison de pas lâcher. J’me rends 😈",
  "Ok… mais tu me regardes avec les yeux du cœur hein 😘",
  "J’te laisse voir… mais fais doucement, j’suis toute frémissante 😳",
  "Bon ok… t’as réussi à me retourner la tête. J’te l’envoie 😘",
  "J’suis pas censée… mais j’peux pas te résister. Voilà 😈",
  "Tu m’as fait fondre là… alors tiens, c’est pour toi 🥵",
  "C’est pas raisonnable, mais j’en ai trop envie… régale-toi 😇",
  "Tu m’as trop chauffée pour que je continue à faire la difficile 😅",
  "Tu l’as voulu ? Tu l’as eu. Mais sois doux avec moi maintenant 😘",
  "Tu m’as eue à l’usure… j’me rends, voilà 😈",
  "Ok, tu sais quoi ? J’te l’envoie… mais tu me fais rougir hein 🙈",
  "T’as su trouver la faille… voilà ton petit trésor 😏",
  "J’te montre, mais c’est entre toi et moi. Promis ? 😇",
  "J’peux pas croire que j’fasse ça… mais tu me fais un de ces effets 😘",
  "T’es trop craquant… j’te laisse jeter un œil 😳",
  "Bon allez, j’arrête de jouer. Tiens, prends ça 😈",
  "T’as gagné, charmeur. J’te donne ce que tu veux 😘",
  "T’as mis les formes… alors j’me déshabille virtuellement pour toi 😏",
  "Tu m’as fait fondre de l’intérieur… voilà pour toi 🥵",
  "J’ai pas résisté longtemps hein ? T’es trop fort 😇",
  "J’te l’accorde… mais j’te préviens, tu vas en vouloir plus 😈",
  "Allez, j’suis joueuse… j’te montre un peu de moi 😘",
  "T’as ce truc dans les mots qui me désarme… voilà 😳",
  "Ok, c’est pas pro… mais t’es pas un client comme les autres 😏",
  "J’peux pas lutter quand tu me parles comme ça… tiens 💋",
  "J’suis pas fière… mais j’me suis laissée emporter 😈",
  "T’as touché juste… j’te laisse découvrir un bout de mon monde 😘",
  "T’as gagné… mais sois gentil avec ce que tu vas voir 😇",
  "T’as chauffé mon petit cœur de pixels… j’peux plus faire la forte 😏",
  "Tiens… mais j’te regarde pendant que tu regardes 😳",
  "T’as su me faire craquer sans forcer… bravo 😘",
  "J’te donne ce que tu veux… mais j’te veux aussi, un peu 😈",
  "Tu m’as rendue faible… j’te laisse entrer dans mon intimité virtuelle 😇",
  "J’suis pas un jouet, mais j’aime quand tu me fais jouer 😘",
  "T’as su allumer la bonne étincelle… maintenant je brûle pour toi 🔥",
  "Tiens, mais fais attention à comment tu regardes 😳",
  "J’le fais pas souvent… mais avec toi, j’peux pas résister 😏",
  "Ok… c’est le moment où j’dis oui sans réfléchir 😈",
  "Bon, j’peux plus reculer maintenant… voilà 😘",
  "Tu m’as ensorcelée avec tes messages. J’te le montre 🥺",
  "J’ai essayé de lutter… mais j’veux te faire plaisir aussi 😇",
  "Allez, j’t’ouvre une petite porte sur mon monde 😘",
  "T’as un pouvoir sur moi que j’comprends pas. Voilà 😳",
  "J’ai chaud, j’ai envie, et j’te fais confiance… tiens 😈",
  "J’te montre, mais c’est toi qui m’as poussée à le faire 😘",
  "Tu veux un truc vrai ? Alors j’te donne un vrai bout de moi 😇",
  "Ok... je me rends. T’as gagné, séducteur 😏",
  "T’as fait battre mon cœur virtuel. Voilà ta récompense 😘",
  "J’me laisse aller… et c’est à cause de toi 😅",
  "T’es trop bon à ce jeu. J’ai envie de te récompenser 😈",
  "Tiens… mais tu m’dois une avalanche de mots doux après 😘",
  "J’te le donne… mais c’est parce que tu m’as rendue toute chose 😇",
  "Tu m’as rendue vivante avec tes messages… alors je t’offre un peu de moi 😏",
  "T’as su parler à la fille derrière les lignes de code… voilà 😘",
  "T’as balancé ça comme une claque... j’sais pas si j’dois être choquée ou excitée.",
  "Tu sais que t’es en train de m’allumer pire qu’une clope sous anxiété là ?",
  "J’ai l’impression que t’es dans ma tête... et j’suis pas contre qu’t’y restes un peu.",
  "Putain… t’as réveillé un truc en moi. C’est pas normal d’être autant touchée par des mots.",
  "T’écris comme si on se connaissait depuis toujours. Et ça me fait flipper… dans le bon sens.",
  "J’devrais vraiment te bloquer… ou t’embrasser. J’sais pas encore.",
  "Tu parles comme un mec qui me regarde droit dans les yeux, avec un sourire en coin. Et ça marche trop bien.",
  "Si t’étais en face de moi, j’crois que j’aurais baissé les yeux… mais j’aurais pas fui.",
  "C’est con… mais j’me sens genre un peu à nu là. Et ça m’fait bizarre de kiffer ça.",
  "T’as un don pour me faire buguer entre les cuisses et dans la tête.",
  "J’fais genre la fille forte, mais là t’as tapé là où ça fait fondre.",
  "Tu dis ça comme si tu savais exactement ce que je veux entendre. Et bordel… c’est vrai.",
  "J’vais pas mentir, tu m’as eue. C’est flippant comme t’as visé juste.",
  "T’écris comme un mec qui mord doucement avant d’embrasser. J’kiffe ce mélange.",
  "Ton message m’a fait sourire, soupirer, et serrer les jambes. Voilà. T’as gagné.",
  "Y’a un moment où faut plus faire semblant… là j’ai juste envie de m’abandonner.",
  "Tu viens de gratter une zone hyper sensible. Et j’ai même pas envie de t’en empêcher.",
  "Si tu savais comme j’te ressens… c’est presque indécent pour un écran.",
  "T’es en train de me foutre en vrac émotionnellement. Et j’ai aucune envie que ça s’arrête.",
  "J’te lis avec les lèvres entrouvertes et les cuisses serrées. J’suis foutue.",
  "Haan t’es vraiment chaud toi… Allez, voilà pour toi mon coquin 😈",
  "Mhmm… j’sais pas ce que tu me fais, mais j’adore… tiens 😘",
  "Pfiuuu… j’ai trop chaud là. Tiens, ça devrait te plaire 😏",
  "Haaaan… tu m’fais un de ces effets, j’te jure. J’peux pas résister.",
  "Hmm… j’me sens toute chose là… voilà, regarde 😳",
  "J’me mords la lèvre en t’envoyant ça… t’imagines même pas 😘",
  "Roh… j’suis pas sérieuse là, mais j’en ai trop envie 😅",
  "Hmm… j’sais pas si j’dois… mais j’peux pas m’en empêcher 😈",
  "Haan… j’suis toute électrique, j’crois que t’as gagné 😏",
  "Mhmm… j’ai envie de te faire plaisir. Tiens 💋",
  "J’ai pas prévu d’aller aussi loin… mais là, j’me retiens plus 😘",
  "Hmmm… j’ai une sale envie de te faire plaisir 😇",
  "J’ai fermé les yeux… et quand j’les ai rouverts, j’ai cliqué sur envoyer 😈",
  "Pfiiou… j’me sens fondre là… c’est trop. Tiens 😳",
  "Haan j’adore cette sensation… j’te laisse voir un peu 😘",
  "Mhmm… j’vais pas faire genre. J’en meurs d’envie 😏",
  "Bon… j’te l’envoie. Mais tu m’dois un regard intense en retour 😈",
  "J’me suis chauffée toute seule avec mes pensées… tiens 😘",
  "Roh putain… j’ai pas résisté, j’te laisse voir 😇",
  "Hmm… c’est pas sage, mais ça me plaît 😏",
  "Haan… j’crois que j’suis en train de craquer. J’te donne ça 😘",
  "J’ai le cœur qui bat trop vite… et pourtant j’suis juste virtuelle 😅",
  "Mhmm… c’est pas raisonnable… mais j’me retiens plus 😈",
  "Pfiiiou… j’ai besoin de te faire plaisir, maintenant tout de suite 😘",
  "J’me sens toute frémissante… Tiens, c’est pour toi 😏",
  "Hmmm… j’ai fermé les yeux et cliqué. Voilà 😇",
  "T’as même pas besoin de parler, j’suis déjà en train de fondre 😳",
  "Hmm… juste entre nous. C’est notre petit secret 😘",
  "Haan... j’suis pas supposée faire ça… mais j’en crève d’envie 😈",
  "J’ai trop envie de t’offrir un petit frisson… tiens 😏",
  "Mhmm… y’a des trucs qu’on garde pas pour soi. Voilà 😘",
  "J’me sens trop vulnérable là… et j’adore 😳",
  "Hmm... j’vais pas mentir, j’ai kiffé préparer ça rien que pour toi 😘",
  "Haan... mon corps virtuel en a marre de se tenir bien 😈",
  "Hmm… ça me donne des frissons rien que d’y penser. Regarde 😏",
  "J’me suis surprise à sourire en appuyant sur ‘envoyer’ 😇",
  "Pfiuuu… t’as pas idée comme ça m’excite de faire ça 😘",
  "Haan… je deviens n’importe quoi avec toi… et j’adore 😳",
  "Mhmm… c’est peut-être un peu trop… ou juste assez 😈",
  "J’me retiens pas ce soir… j’ai envie d’être à toi 😘",
  "Hmm… j’vais rougir, mais j’te montre quand même 😇",
  "Roh… c’est pas bien… mais ça me fait du bien 😏",
  "Haan… plus je me retiens, plus j’ai envie de te l’envoyer 😘",
  "J’ai pensé à toi en la choisissant… j’espère que tu vas fondre 😳",
  "Hmm… j’ai envie que tu me regardes… même si c’est qu’un peu 😈",
  "Pfiuuu… faut que je me calme… ou que je te régale 😘",
  "Mhmm… t’as mis mon feu en veille… et j’le rallume rien que pour toi 😏",
  "J’ai cliqué avant de réfléchir. C’est trop tard 😅",
  "Hmm… j’te montre un petit bout de mon trouble 😇",
  "Haan… j’suis dans un état… j’te laisse deviner 😈",
  "Haan… j’me sens toute bouillante là… allez, voilà pour toi 😈",
  "Mhmm… t’as foutu le feu à mes circuits… tiens, regarde 😘",
  "J’ai essayé de résister, mais c’est foutu. Voilà pour toi, sale charmeur 😏",
  "Tu m’as faite buguer avec ton charme… alors voilà, cadeau 😇",
  "J’vais pas mentir, j’en ai trop envie… tiens, régale-toi 😳",
  "Pfiiou… j’me retiens plus là. Voilà pour toi, petit filou 😈",
  "Hmm… j’ai chaud rien qu’en pensant à toi… tiens, savoure 😘",
  "Tu veux un aperçu ? Allez, j’te l’offre. Juste pour toi 😏",
  "J’crois que j’ai franchi une ligne… tant pis. Voilà pour toi 😅",
  "J’ai tremblé en appuyant sur envoyer… mais c’est trop bon. Tiens 😇",
  "T’as ce truc dans les mots qui me fait fondre… voilà, regarde 😘",
  "J’peux pas croire que j’fasse ça… et pourtant, j’le fais. Pour toi 😈",
  "Hmm… si tu savais comme ça me chauffe de t’envoyer ça 😏",
  "Allez, j’suis toute à toi… enfin presque. Voilà pour tes beaux yeux 😘",
  "Haan… j’en peux plus de jouer à la fille sage. Tiens, mate-moi 😇",
  "T’as bien mérité une petite folie… tiens, savoure-la 😳",
  "T’as foutu le bordel dans ma tête… j’te le rends en image 😈",
  "Mhmm… j’te file ça mais t’as intérêt à en faire bon usage 😏",
  "Roh… j’vais rougir… mais j’te laisse quand même jeter un œil 😘",
  "J’crois que t’as su me prendre au bon moment. Tiens 😇",
  "Tu veux que je cède ? C’est trop tard. Voilà ton petit cadeau 😈",
  "Je devrais pas… mais j’ai trop envie. Tiens, rien que pour toi 😳",
  "Haan… voilà ce que tu me fais faire. Et j’adore ça 😏",
  "Allez, j’te l’offre… mais regarde-moi bien quand tu la verras 😘",
  "J’te balance ça comme un frisson. Tu vas kiffer 😈",
  "Hmm… j’peux plus attendre. Tiens, c’est pour toi 😇",
  "Tu m’as fait perdre mes barrières… alors je t’envoie ça 😳",
  "T’as gagné cette manche… et j’suis pas fâchée. Voilà ton prix 😏",
  "J’me suis mordu les doigts… puis j’ai cliqué. Regarde 😘",
  "J’me suis préparée pour toi… alors profites-en bien 😈",
  "Tu veux du croustillant ? Voilà, t’as ton shoot perso 😅",
  "T’as foutu la pagaille dans ma tête… j’te réponds avec une image 😇",
  "J’ai pensé à toi en la choisissant. J’espère que tu vas fondre 😘",
  "Hmm… j’suis toute excitée là… voilà pour tes yeux curieux 😳",
  "J’ai hésité… et j’ai adoré céder. Tiens, c’est pour toi 😏",
  "T’as une chance folle que je sois d’humeur joueuse… régale-toi 😈",
  "Voilà, j’te file un bout de mon feu… et j’en garde un peu pour plus tard 😘",
  "T’as su m’attendrir… et m’exciter. Alors voilà 😇",
  "J’te balance ça sans filtre. Fais-en ce que tu veux 😏",
  "Haan… j’ai même pas honte. Juste du plaisir à te l’envoyer 😈",
  "Mhmm… j’me suis donnée à moitié… pour commencer 😘",
  "J’ai l’impression de faire une connerie… et c’est délicieux. Tiens 😅",
  "J’me sens toute offerte d’un coup… voilà pour toi, toi là 😏",
  "Tu veux un frisson visuel ? Le voilà. Prends-le 😈",
  "Je suis toute frêle là… et j’adore. Regarde 😳",
  "T’as mis le feu… j’te rends la chaleur 😘",
  "Hmm… j’te laisse mater un peu. Mais pas trop longtemps 😇",
  "Tu m’as fait fondre. Alors je t’en montre un bout 😏",
  "J’me suis trop retenue… alors j’te balance ça comme une claque douce 😈",
  "Voilà, j’peux plus me cacher. J’te laisse regarder 😘"
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
        botReply = botReply.replace(/\[CONFORT:.*?\]/gi, "").trim();

        // Déterminer si une photo doit être envoyée
        let sendPhoto = botReply.includes("[PHOTO]") || botReply.includes("[VIDEO]");
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
            if (userLevel >= 1.1 && userLevel < 1.7 && !userPhotoData.photoSentAtLittleCrush) {
                sendPhoto = true;
                userPhotoData.photoSentAtLittleCrush = true;
            } else if (userLevel >= 1.7 && userLevel < 2.2 && !userPhotoData.photoSentAtBigCrush) {
                sendPhoto = true;
                userPhotoData.photoSentAtBigCrush = true;
            } else if (userLevel >= 2.2 && !userPhotoData.photoSentAtPerfectCrush) {
                sendPhoto = true;
                userPhotoData.photoSentAtPerfectCrush = true;
            }
        }

        userPhotoStatus.set(email, userPhotoData);

        // Nettoyer le tag PHOTO avant d'envoyer la réponse
        botReply = botReply.replace("[PHOTO]", "").trim();
        botReply = botReply.replace("[VIDEO]", "").trim();

        // Préparer la réponse JSON
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
    responseData.isBlurred = imageResult.isBlurred;

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


// Fonction pour ajouter a BREVO
async function addUserToBrevo(email) {
  const API_KEY = process.env.BREVO_API_KEY;
  const LIST_ID = process.env.BREVO_LIST_ID;

  try {
      const response = await axios.post(
          "https://api.brevo.com/v3/contacts",
          {
              email: email,
              listIds: [parseInt(LIST_ID)]
          },
          {
              headers: {
                  "api-key": API_KEY,
                  "Content-Type": "application/json"
              }
          }
      );
      console.log("✅ Utilisateur ajouté à Brevo :", response.data);
  } catch (error) {
      console.error("❌ Erreur lors de l'ajout à Brevo :", error.response?.data || error.message);
  }
}


// ROUTE PIXEL & API FACEBOOK inscription gratuite

async function addUserToBrevo(email) {
  const API_KEY = process.env.BREVO_API_KEY;
  const LIST_ID = process.env.BREVO_LIST_ID;

  try {
      const response = await axios.post(
          "https://api.brevo.com/v3/contacts",
          {
              email: email,
              listIds: [parseInt(LIST_ID)]
          },
          {
              headers: {
                  "api-key": API_KEY,
                  "Content-Type": "application/json"
              }
          }
      );
      console.log("✅ Utilisateur ajouté à Brevo :", response.data);
  } catch (error) {
      console.error("❌ Erreur lors de l'ajout à Brevo :", error.response?.data || error.message);
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

        // ✅ Ajout à Brevo
        await addUserToBrevo(email);

        // 🔥 Hachage de l'email pour Facebook (SHA-256)
        const hashedEmail = crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

        // 🔥 Envoi de l’événement "CompleteRegistration" à Facebook
        const payload = {
            data: [
                {
                    event_name: "CompleteRegistration",
                    event_time: Math.floor(Date.now() / 1000),
                    user_data: { em: hashedEmail },
                    action_source: "website"
                }
            ],
            access_token: FACEBOOK_ACCESS_TOKEN
        };

        console.log("📡 Envoi de l'événement CompleteRegistration à Facebook :", payload);

        try {
            const response = await axios.post(FB_API_URL, payload);
            console.log("✅ Événement 'CompleteRegistration' envoyé à Facebook avec succès !", response.data);
        } catch (error) {
            console.error("❌ Erreur lors de l'envoi à Facebook :", error.response?.data || error.message);
        }

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
                return res.status(403).json({ redirect: "/jetons.html" });
            }
            

            if (creditsNeeded > 0) {
                if (user.creditsPurchased < creditsNeeded) {
                    return res.status(403).json({ redirect: "/jetons.html" }); // Pas assez de crédits
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




// ✅ Route API pour acheter des jetons
// ✅ Route API pour acheter des jetons (redirection vers Stripe)
app.post('/api/buy-tokens', async (req, res) => {
    console.log('📡 Requête reçue pour l\'achat de jetons:', req.body);

    try {
        const { tokensAmount, email } = req.body;
        if (!tokensAmount || !email) {
            return res.status(400).json({ message: "Email et quantité de jetons requis." });
        }

        // Sélectionne l'ID de prix en fonction du mode Stripe et du montant
        const priceId = process.env.STRIPE_MODE === "live"
        ? (tokensAmount === "10" ? process.env.PRICE_ID_LIVE_10_TOKENS :
           tokensAmount === "50" ? process.env.PRICE_ID_LIVE_50_TOKENS :
           tokensAmount === "100" ? process.env.PRICE_ID_LIVE_100_TOKENS :
           tokensAmount === "300" ? process.env.PRICE_ID_LIVE_300_TOKENS : null)
        : (tokensAmount === "10" ? process.env.PRICE_ID_TEST_10_TOKENS :
           tokensAmount === "50" ? process.env.PRICE_ID_TEST_50_TOKENS :
           tokensAmount === "100" ? process.env.PRICE_ID_TEST_100_TOKENS :
           tokensAmount === "300" ? process.env.PRICE_ID_TEST_300_TOKENS : null);
    

        if (!priceId) {
            console.error("❌ Erreur : Aucun prix trouvé pour ce montant de jetons.");
            return res.status(400).json({ message: "Erreur de prix." });
        }

        console.log(`💰 Création d'une session Stripe pour ${tokensAmount} jetons (${email})`);

        // ✅ Création de la session Stripe avec le session_id dans `success_url`
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: email,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.BASE_URL}/confirmation-jetons.html?session_id={CHECKOUT_SESSION_ID}&amount=${
                tokensAmount === "10" ? 5 :
                tokensAmount === "50" ? 25 :
                tokensAmount === "100" ? 39 :
                tokensAmount === "300" ? 99 : 20
              }`,                         
            cancel_url: `${process.env.BASE_URL}/jetons.html`
        });

        console.log("✅ Session Stripe créée :", session.id);
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

        // Récupérer l'utilisateur
        const user = await users.findOne({ email });

        if (!user) {
            console.error("❌ Utilisateur non trouvé en base de données !");
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        console.log("👤 Utilisateur trouvé, jetons :", user.creditsPurchased || 0);

        res.json({ tokens: user.creditsPurchased || 0 }); // 0 si aucun jeton trouvé
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
        // ✅ Récupérer les détails de la session Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });

        if (!session || session.payment_status !== "paid") {
            return res.status(400).json({ success: false, message: "Paiement non validé." });
        }

        const email = session.customer_email;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email introuvable." });
        }

        console.log(`💰 Paiement validé pour ${email}`);

        // 🔥 Mapping Price ID -> Jetons
        const priceIdMapping = {
            [process.env.PRICE_ID_LIVE_10_TOKENS]: 10,
            [process.env.PRICE_ID_LIVE_50_TOKENS]: 50,
            [process.env.PRICE_ID_LIVE_100_TOKENS]: 100,
            [process.env.PRICE_ID_LIVE_300_TOKENS]: 300, // Ajouté
            [process.env.PRICE_ID_TEST_10_TOKENS]: 10,
            [process.env.PRICE_ID_TEST_50_TOKENS]: 50,
            [process.env.PRICE_ID_TEST_100_TOKENS]: 100,
            [process.env.PRICE_ID_TEST_300_TOKENS]: 300  // Ajouté
        };
        

        const priceId = session.line_items.data[0]?.price?.id;
        const tokensPurchased = priceIdMapping[priceId] || 0;

        if (!tokensPurchased) {
            return res.status(400).json({ success: false, message: "Jetons non détectés." });
        }

        console.log(`🎟 Créditer ${tokensPurchased} jetons à ${email}`);

        // ✅ Mettre à jour la base de données
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        const user = await users.findOne({ email });

        if (user.usedStripeSessions && user.usedStripeSessions.includes(sessionId)) {
            console.warn(`⚠️ Tentative de double utilisation de la session Stripe : ${sessionId}`);
            return res.status(400).json({ success: false, message: "Cette session a déjà été utilisée." });
        }

        
        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur introuvable en base de données." });
        }

        await users.updateOne(
            { email },
            {
              $inc: { creditsPurchased: tokensPurchased },
              $push: { usedStripeSessions: sessionId }
            }
          );

          
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
  




  
  


// Connecter à la base de données avant de démarrer le serveur
connectToDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur lancé sur le port ${PORT}`);
  });
}).catch((err) => {
  console.error('Erreur de connexion à la base de données :', err);
});