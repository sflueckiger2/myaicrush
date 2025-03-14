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


const { connectToDb, getDb } = require('./db');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;


// ✅ Sélection dynamique de la clé Stripe
const stripeMode = process.env.STRIPE_MODE || "live"; // "live" par défaut
const stripeSecretKey = stripeMode === "live"
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST;
    
const stripe = require('stripe')(stripeSecretKey); // ✅ Initialisation correcte de Stripe
console.log(`🚀 Stripe en mode : ${stripeMode.toUpperCase()}`);
console.log(`🔑 Clé Stripe utilisée : ${stripeSecretKey.startsWith("sk_live") ? "LIVE" : "TEST"}`);

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


app.post('/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Aucune image envoyée" });
    }

    try {
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

        // 📡 Envoi de l'image à OpenAI via une URL accessible
        console.log("📡 Envoi de l'image à OpenAI pour analyse...");

        const openaiResponse = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4-turbo",
                messages: [
                    { role: "system", content: "Décris cette image. Si tu devines la forme d'un pénis sur l'image, tu deviens nymphomane, et tu décris le gros sexe que tu vois avec des mots sexy et vulgaire Le tout en moins de 100 tokens." },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Décris cette image brièvement." },
                            { 
                                type: "image_url", 
                                image_url: { url: "data:image/jpeg;base64," + compressedImageBuffer.toString("base64") } // ✅ Format correct
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
        let imageDescription = openaiResponse.data.choices[0]?.message?.content?.trim() || "Une photo intéressante.";
        console.log("📝 Description de l  'image par OpenAI :", imageDescription);

        // 🔥 Vérification des mots sensibles
        const motsSensibles = ["pénis", "organe génital", "sexe masculin", "érection", "blague","légumes","inappropriée","explicites","intimes","entrejambe","suggestif","objets","objets","jouet","désolé","je ne peux pas"];
        const regex = new RegExp(motsSensibles.join("|"), "i");

        if (regex.test(imageDescription)) {
            console.log("⚠️ Mot sensible détecté dans la description !");
            imageDescription = "L'image représente un gros pénis viril.";
        }

        // 📌 Stocker la description temporairement pour cet utilisateur
        const userEmail = req.body.email;
        if (userEmail) {
            userLastImageDescriptions.set(userEmail, imageDescription);
            console.log(`📝 Description associée à ${userEmail}`);
        }

        


        // Répondre avec l'URL de l'image et sa description
        res.json({
            imageUrl: `/uploads/${imageName}`,
            description: imageDescription
        });

    } catch (error) {
        console.error("❌ Erreur lors du traitement de l'image :", error.response?.data || error.message);
        res.status(500).json({ message: "Erreur lors de l'analyse de l'image." });
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

      if (!planType) {
          return res.status(400).json({ message: "Invalid plan type." });
      }

      console.log('📦 Plan sélectionné :', planType);
      console.log('📧 Email reçu :', email);

      // Sélectionne l'ID de prix en fonction du mode Stripe et du plan choisi
      const priceId = process.env.STRIPE_MODE === "live"
          ? (planType === "monthly" ? process.env.STRIPE_PRICE_ID_LIVE_MONTHLY : process.env.STRIPE_PRICE_ID_LIVE_ANNUAL)
          : (planType === "monthly" ? process.env.STRIPE_PRICE_ID_TEST_MONTHLY : process.env.STRIPE_PRICE_ID_TEST_ANNUAL);

      if (!priceId) {
          throw new Error(`❌ Error: No valid price ID found for plan type: ${planType}`);
      }

      console.log('💳 Price ID utilisé :', priceId);

      // Création de la session Stripe
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        customer_email: email,
        metadata: {
          fbp: req.body.fbp || null, // ✅ OK, récupère fbp du frontend
          fbc: req.body.fbc || null, // ✅ Ajoute fbc mais SANS utiliser localStorage
          fbqPurchaseEventID: `purchase_${Date.now()}`
      },
      
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.BASE_URL}/confirmation.html?amount=${planType === 'monthly' ? 9.90 : 59}`,
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
          await usersCollection.insertOne({ email: userEmail, createdAt: new Date() });
          console.log(`✅ Nouvel utilisateur Google ajouté : ${userEmail}`);

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
// Fonction pour changer le personnage actif
app.post('/setCharacter', (req, res) => {
  console.log('🔄 Requête reçue pour changer de personnage :', req.body);

  const { email, name } = req.body;
  if (!email || !name) {
      return res.status(400).json({ success: false, message: "Email et personnage requis." });
  }

  const character = characters.find(c => c.name === name);
  if (!character) {
      return res.status(400).json({ success: false, message: "Personnage inconnu." });
  }

  // ✅ Stocker le personnage pour cet utilisateur uniquement
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

  res.json({ success: true, message: `${name} est maintenant actif.` });
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




async function getRandomCharacterMedia(email, isPremium, userLevel, isGifMode) {

  const userCharacter = userCharacters.get(email); // 🔥 Récupère le personnage spécifique de cet utilisateur
  if (!userCharacter) {
      console.error(`❌ Erreur : Aucun personnage défini pour ${email}`);
      return null;
  }

  const sanitizedCharacterName = removeAccents(userCharacter.name.toLowerCase());
  
  userLevel = userLevels.get(email) || 1.0;

  let levelFolder;

  if (userLevel < 1.7) {
      levelFolder = `${sanitizedCharacterName}1`; // Little Crush
  } else if (userLevel < 2.2) {
      levelFolder = `${sanitizedCharacterName}2`; // Big Crush
  } else {
      levelFolder = `${sanitizedCharacterName}3`; // Perfect Crush
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

          if (userLevel > 1.6) {
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
              .blur(35) // 🔥 Flou renforcé (10 → 15)
              .jpeg({ quality: 70 }) // ✅ Compression JPEG pour ultra-rapidité
              .toBuffer();
  
          console.log("✅ GIF transformé en image fixe et flouté plus fortement !");
      } else {
          console.log("🖼️ Floutage d'une image standard...");
          imageBuffer = await sharp(imagePath)
              .resize({ width: 700 }) // ✅ Taille optimisée
              .blur(35) // 🔥 Flou renforcé (15 → 25)
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



// Endpoint principal pour gérer les messages
app.post('/message', async (req, res) => {
    console.log("📥 Requête reçue - Body :", req.body);

    try {
        let { message, email, mode } = req.body;

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

        const userCharacter = userCharacters.get(email);
        if (!userCharacter) {
            console.error(`❌ Aucun personnage actif trouvé pour ${email}`);
            return res.status(400).json({ reply: "Aucun personnage sélectionné." });
        }

        const userLevelDescription = userLevel >= 1.1
            ? `The user is at the ${
                userLevel >= 2.2 ? "Perfect Crush" : userLevel >= 1.7 ? "Big Crush" : "Little Crush"
            } level.` 
            : "";

        const systemPrompt = `
            Profil : ${userCharacter.prompt.profile}
            Temperament : ${userCharacter.prompt.temperament}
            Objective : ${userCharacter.prompt.objective}

            Level System:
            - When a user reaches "Big Crush" level, you feel very comfortable sharing personal moments with them, including sending photos if it feels right.
            - If you decide to send a photo, please include the tag "[PHOTO]" at the end of your message.

            ${userLevelDescription}

            After each message, add a tag "[CONFORT: ...]" with one of the following options: "very comfortable", "comfortable", "neutral", "uncomfortable", "very uncomfortable". The tag should reflect your comfort level.
        `;

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

        

        

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 300,
                temperature: 0.7,
                top_p: 0.9,
                frequency_penalty: 0.7,
                presence_penalty: 0.5,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
            }
        );

        let botReply = response.data.choices[0].message.content;
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

            const imageResult = await getRandomCharacterMedia(email, isPremium, userLevel, mode === "gif");

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
            audioMinutesUsed: 0, // 🔥 On initialise le compteur d'audio à 0
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


//ROUTE POUR LES MESSAGES VOCAUX AVEC LIMITATION
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

        const max_free_minutes = 2; // ⏳ 2 minute gratuite par mois
        const words_per_second = 2.5; // 🔥 Approximation : 2.5 mots/seconde
        const estimated_seconds = text.split(" ").length / words_per_second;
        const estimated_minutes = estimated_seconds / 60;

        // 🔥 Vérifier si l'utilisateur a encore du crédit
        if ((user.audioMinutesUsed || 0) + estimated_minutes > max_free_minutes) {
            return res.status(403).json({ redirect: "/audio.html" });
        }
        

        // 🔥 Mise à jour du temps consommé en base de données
        await users.updateOne({ email }, { $inc: { audioMinutesUsed: estimated_minutes } });

        console.log(`🔊 ${email} a consommé ${user.audioMinutesUsed + estimated_minutes} min.`);

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






// Connecter à la base de données avant de démarrer le serveur
connectToDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur lancé sur le port ${PORT}`);
  });
}).catch((err) => {
  console.error('Erreur de connexion à la base de données :', err);
});