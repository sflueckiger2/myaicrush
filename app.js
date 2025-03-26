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

let nsfwModel;
async function loadNSFWModel() {
    nsfwModel = await nsfw.load();
    console.log("🔥 Modèle NSFW chargé !");
}

loadNSFWModel(); // Appel au démarrage

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
        const predictions = await nsfwModel.classify(canvas);

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
  imageTokens.set(token, { imagePath, isBlurred });

  // Supprimer le token après 10 minutes
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


// Route pour créer une session de paiement Stripe
app.post('/api/create-checkout-session', async (req, res) => {
    console.log('📡 Requête reçue sur /api/create-checkout-session');
    console.log('Corps de la requête :', req.body);
  
    try {
        const { planType, email } = req.body;
  
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
  
        // 🔍 On cherche dans default + tests
        const allPlans = [
            ...(pricingConfig.default_price.variants || []),
            ...(pricingConfig.active_tests[0]?.variants || [])
        ];
  
        const selectedPlan = allPlans.find(p =>
            p.name.toLowerCase().includes(planType.toLowerCase())
        );
  
        if (!selectedPlan) {
            throw new Error(`❌ Plan "${planType}" non trouvé dans le fichier pricing-config.json`);
        }
  
        const priceId = stripeMode === "live"
            ? selectedPlan.stripe_id_live
            : selectedPlan.stripe_id_test;
  
        if (!priceId) {
            throw new Error(`❌ Aucun price ID défini pour le mode ${stripeMode} sur le plan "${planType}"`);
        }
  
        console.log('💳 Price ID utilisé :', priceId);

        // ✅ On récupère l’ID du test actif (ou "default" si aucun)
        const testId = pricingConfig.active_tests?.[0]?.id || 'default';

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
        // ✅ Stocker le personnage pour cet utilisateur uniquement (mémoire)
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
      const mediaFiles = fs.readdirSync(imageDir).filter(file => 
          isGifMode ? file.endsWith('.gif') : !file.endsWith('.gif')
      );

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
          isBlurred: isBlurred // ✅ On ajoute bien isBlurred dans l'objet retourné
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

    const { imagePath, isBlurred } = imageData;
    console.log(`📸 Chargement de l'image : ${imagePath} (Floutée : ${isBlurred})`);

    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Fichier introuvable : ${imagePath}`);
      return res.status(404).send('Image non trouvée');
    }

    let contentType = imagePath.endsWith('.gif') ? 'image/gif' : 'image/jpeg';

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
  



    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=604800, immutable', // Cache efficace
    });
    res.end(imageBuffer, 'binary'); // ✅ Une seule réponse
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
        if (jetons < 10) {
            return res.status(403).json({ success: false, message: "Pas assez de jetons", redirect: "/jetons.html" });
        }

        // ✅ Déduire les jetons et enregistrer l’activation pour 24h
        const expiresAt = now + 24 * 60 * 60 * 1000;

        await users.updateOne(
            { email },
            {
                $set: { [`nymphoUnlocked.${characterName}`]: expiresAt },
                $inc: { creditsPurchased: -10 }
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
    "Humm… c’est tentant, mais il va falloir me séduire encore un peu. 😉"
];

// Fonction pour intercepter et ajuster les réponses de l'IA
function ajusterReponse(reponse) {
    const refusRegex = /désolé[e]?,?( mais)? je ne peux pas/i;

    if (refusRegex.test(reponse.toLowerCase())) {
        console.log("🎯 Détection d'un refus, remplacement...");
        return reponsesPerso[Math.floor(Math.random() * reponsesPerso.length)];
    }

    return reponse; // Si pas de refus, on garde la réponse normale
}



// 🔥 Modifier la réponse de l'IA avant de l'envoyer à l'utilisateur
let botReply = response.data.choices[0].message.content.trim();
botReply = ajusterReponse(botReply);

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
                console.log(`✅ Image envoyée avec succès. Floutée: ${imageResult.isBlurred}`);
            } else {
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

        const max_free_minutes = 0.5; // ⏳ 2 minutes gratuites par mois
        const words_per_second = 4.2; // 🔥 Approximation : 2.5 mots/seconde
        const estimated_seconds = text.split(" ").length / words_per_second;
        const estimated_minutes = estimated_seconds / 60;

        console.log(`📊 Durée estimée : ${estimated_seconds.toFixed(2)} sec (${estimated_minutes.toFixed(2)} min)`);
        
        let newAudioMinutesUsed = (user.audioMinutesUsed || 0) + estimated_minutes;

        // 🔥 Vérifier si l'utilisateur a encore du crédit gratuit
        if (newAudioMinutesUsed <= max_free_minutes) {
            // ✅ Il reste des minutes gratuites, on les utilise
            await users.updateOne({ email }, { $set: { audioMinutesUsed: newAudioMinutesUsed } });
            console.log(`🔊 ${email} a utilisé ${estimated_minutes.toFixed(2)} min gratuites.`);
        } else {
            // ✅ L'utilisateur a dépassé ses minutes gratuites → Utilisation des crédits
            const paidMinutes = newAudioMinutesUsed - max_free_minutes;
            const creditsNeeded = Math.floor(paidMinutes); // ❗ Déduction **seulement** quand 1 min complète est atteinte
            
            console.log(`💳 Minutes payantes accumulées : ${paidMinutes.toFixed(2)} min (${creditsNeeded} crédits nécessaires)`);

            if (creditsNeeded > 0) {
                if (user.creditsPurchased < creditsNeeded) {
                    return res.status(403).json({ redirect: "/jetons.html" }); // Pas assez de crédits
                }

                // ✅ Déduire uniquement les crédits nécessaires et remettre le surplus à `audioMinutesUsed`
                newAudioMinutesUsed = max_free_minutes + (paidMinutes - creditsNeeded); 

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
               process.env.PRICE_ID_LIVE_100_TOKENS)
            : (tokensAmount === "10" ? process.env.PRICE_ID_TEST_10_TOKENS :
               tokensAmount === "50" ? process.env.PRICE_ID_TEST_50_TOKENS :
               process.env.PRICE_ID_TEST_100_TOKENS);

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
                tokensAmount === "100" ? 39 : 20
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
            [process.env.PRICE_ID_TEST_10_TOKENS]: 10,
            [process.env.PRICE_ID_TEST_50_TOKENS]: 50,
            [process.env.PRICE_ID_TEST_100_TOKENS]: 100
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
        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur introuvable en base de données." });
        }

        await users.updateOne({ email }, { $inc: { creditsPurchased: tokensPurchased } });

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



// Connecter à la base de données avant de démarrer le serveur
connectToDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur lancé sur le port ${PORT}`);
  });
}).catch((err) => {
  console.error('Erreur de connexion à la base de données :', err);
});