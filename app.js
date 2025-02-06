require('dotenv').config(); // Charger les variables d'environnement
const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const app = express(); // Initialiser l'instance d'Express
const { connectToDb, getDb } = require('./db');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Stripe SDK
app.use(express.json());
app.use(express.static('public')); // Servir les fichiers du dossier "public"
const { createCheckoutSession, cancelSubscription, getUserSubscription } = require('./public/scripts/stripe.js');
const { MongoClient } = require('mongodb'); // Import de MongoClient
const bcrypt = require('bcrypt');

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


app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Un compte avec cet email existe déjà' });
        }

        // Générer un hash pour le mot de passe
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Ajouter l'utilisateur avec le mot de passe haché
        await users.insertOne({ email, password: hashedPassword });

        res.status(201).json({ message: 'User created successfully!' });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


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
  console.log('Requête reçue sur /api/create-checkout-session');
  console.log('Corps de la requête :', req.body);

  try {
      const { priceId } = req.body; // Récupère l'ID du prix Stripe depuis le frontend
      console.log('Price ID reçu :', priceId);

      if (!priceId) {
          return res.status(400).json({ message: 'Price ID is required' });
      }

      // Dynamiser les URLs avec BASE_URL
      const successUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/confirmation.html`;
      const cancelUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/premium.html`;

      const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [
              {
                  price: priceId, // Utilise l'ID de prix fourni par Stripe
                  quantity: 1,
              },
          ],
          success_url: successUrl,
          cancel_url: cancelUrl,
      });

      console.log('Session Checkout créée avec succès :', session.url);
      res.json({ url: session.url }); // Renvoie l'URL de la session Stripe
  } catch (error) {
      console.error('Error creating checkout session:', error.message);
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

      // Ajouter ou récupérer l'utilisateur dans MongoDB
      const user = await addOrFindUser(userEmail);

      console.log('Utilisateur Google authentifié :', user);
     

      // Générer une réponse HTML avec un script pour stocker l'utilisateur dans localStorage
      res.send(`
        <script>
            localStorage.setItem('user', JSON.stringify(${JSON.stringify(user)}));
            window.location.href = '${BASE_URL}/index.html';
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
let userLevel = 1.0;
let photoSentAtLittleCrush = false; // Variable pour suivre l'envoi de la photo au niveau Little Crush
let photoSentAtBigCrush = false; // Variable pour suivre l'envoi de la photo au niveau Big Crush
let photoSentAtPerfectCrush = false;
let activeCharacter = characters[0]; // Par défaut, le premier personnage (Hanaé)
console.log('Personnage actif au démarrage :', activeCharacter.name);


// Fonction pour supprimer les accents
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Supprime les accents
}

// Fonction pour changer le personnage actif
app.post('/setCharacter', (req, res) => {
  console.log('Requête reçue pour changer de personnage :', req.body); // Ajout
  const { name } = req.body;
  const character = characters.find(c => c.name === name);

  if (character) {
    activeCharacter = character;
    console.log('Personnage actif modifié :', activeCharacter.name); // Ajouter ici
    conversationHistory = []; // Réinitialiser l'historique pour un nouveau personnage
    photoSentAtLittleCrush = false; // Réinitialise l'état d'envoi de photo pour "Little Crush"
    photoSentAtBigCrush = false; // Réinitialiser l'état d'envoi de photo
    res.json({ success: true, message: `${name} est maintenant actif.` });
  } else {
    res.status(400).json({ success: false, message: "Personnage inconnu." });
  }
});

// Ajouter un message à l'historique
function addMessageToHistory(role, content) {
  if (content) {
    conversationHistory.push({ role, content });
    if (conversationHistory.length > 15) {
      conversationHistory.shift();
    }
  }
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


const sharp = require('sharp');

async function getRandomCharacterImage(isPremium, userLevel) {
  const sanitizedCharacterName = removeAccents(activeCharacter.name.toLowerCase());
  let levelFolder;

  if (userLevel < 1.7) {
    levelFolder = `${sanitizedCharacterName}1`; // Little Crush
  } else if (userLevel < 2.2) {
    levelFolder = `${sanitizedCharacterName}2`; // Big Crush
  } else {
    levelFolder = `${sanitizedCharacterName}3`; // Perfect Crush
  }

  const imageDir = path.join(__dirname, 'public', 'images', sanitizedCharacterName, levelFolder);
  console.log(`📂 Chemin du dossier image : ${imageDir}`);

  try {
    // Vérifier que le dossier existe
    if (!fs.existsSync(imageDir)) {
      console.error(`❌ Le dossier ${imageDir} n'existe pas.`);
      return null;
    }

    // Lire les fichiers dans le dossier
    const images = fs.readdirSync(imageDir).filter(file => file.endsWith('.jpg') || file.endsWith('.png'));
    if (images.length === 0) {
      console.error(`⚠️ Aucune image trouvée dans ${imageDir}`);
      return null;
    }

    // Sélectionner une image au hasard
    const randomImage = images[Math.floor(Math.random() * images.length)];
    const imagePath = path.join(imageDir, randomImage);
    console.log("📸 Image sélectionnée :", imagePath);

    // Vérifier si le fichier existe
    if (!fs.existsSync(imagePath)) {
      console.error(`❌ L'image sélectionnée ${imagePath} n'existe pas.`);
      return null;
    }

    // Charger l'image avec sharp
    try {
      const image = sharp(imagePath);
      console.log("✅ Image chargée avec sharp :", imagePath);

      let processedImage;
      if (!isPremium && userLevel >= 1.1) {
        console.log("💨 Application du floutage sur l'image...");
        processedImage = await image.blur(10).toBuffer();
      } else {
        processedImage = await image.toBuffer();
      }

      console.log("✅ Image traitée avec succès.");
      return {
        image: `data:image/jpeg;base64,${processedImage.toString('base64')}`,
        blurred: !isPremium,
      };
    } catch (err) {
      console.error(`❌ Erreur lors du traitement de l'image avec sharp :`, err);
      return null;
    }
  } catch (err) {
    console.error(`❌ Erreur générale lors de la récupération ou du traitement de l'image :`, err);
    return null;
  }
}



// Extraire le niveau de confort depuis la réponse du bot
function extractComfortLevel(botReply) {
  const comfortMatch = botReply.match(/\[CONFORT:\s*(very comfortable|comfortable|neutral|uncomfortable|very uncomfortable)\]/i);
  return comfortMatch ? comfortMatch[1].toLowerCase() : "neutral";
}

// Ajuster le niveau de l'utilisateur en fonction du confort extrait
function adjustUserLevel(comfortLevel) {
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

  const previousLevel = userLevel;
  userLevel = Math.max(1.0, userLevel + levelChange);
  userLevel = Math.round(userLevel * 10) / 10;

  console.log(`Comfort Level: ${comfortLevel}, Level Change: ${levelChange}, New Level: ${userLevel}, Previous Level: ${previousLevel}`);

  if (levelChange > 0 && userLevel > previousLevel) {
    if (userLevel === 1.1) return { message: "Bravo, tu lui plaît.", type: "up" };
    if (userLevel === 1.7) return { message: "Elle est folle de toi ", type: "up" };
    if (userLevel === 2.2) return { message: "Wow, tu es son crush parfait !", type: "up" };
  } else if (levelChange < 0 && previousLevel > userLevel) {
    if (userLevel < 1.2) return { message: "Tu baisses dans son estime", type: "down" };
    if (userLevel < 1.8) return { message: "Elle n'a pas aimé ta réponse", type: "down" };
  }

  return null;
}

// Endpoint principal pour gérer les messages
app.post('/message', async (req, res) => {
  console.log("📩 Requête reçue sur /message", req.body); // Log du message reçu

  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      console.error("❌ Erreur : message vide");
      return res.status(400).json({ reply: "Votre message est vide. Veuillez envoyer un message valide." });
    }

    console.log("💬 Message utilisateur :", userMessage);

    addMessageToHistory("user", userMessage);

    // Vérification du statut premium (ajoute ici une vraie logique si nécessaire)
    const isPremium = true; // Tu peux remplacer cette valeur par un vrai check premium
    console.log("🌟 Statut premium:", isPremium);
    console.log("📊 Niveau utilisateur:", userLevel);

    // Préparer le prompt pour OpenAI
    const userLevelDescription = userLevel >= 1.1 
      ? `The user is at the ${
          userLevel >= 2.2 ? "Perfect Crush" : userLevel >= 1.7 ? "Big Crush" : "Little Crush"
        } level.`
      : "";

    const systemPrompt = `
      Profil : ${activeCharacter.prompt.profile}
      Temperament : ${activeCharacter.prompt.temperament}
      Objective : ${activeCharacter.prompt.objective}

      Level System:
      - When a user reaches "Big Crush" level, you feel very comfortable sharing personal moments with them, including sending photos if it feels right.
      - If you decide to send a photo, please include the tag "[PHOTO]" at the end of your message.

      ${userLevelDescription}

      After each message, add a tag "[CONFORT: ...]" with one of the following options: "very comfortable", "comfortable", "neutral", "uncomfortable", "very uncomfortable". The tag should reflect your comfort level.
    `;

    // Construire le contexte du chat pour OpenAI
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
    ];

    console.log("📡 Envoi du prompt à OpenAI...");

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 100,
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

    addMessageToHistory("assistant", botReply);

    // Extraire le niveau de confort et ajuster le niveau utilisateur
    const comfortLevel = extractComfortLevel(botReply);
    const levelUpdate = adjustUserLevel(comfortLevel);

    // Nettoyer le message de la mention de confort
    botReply = botReply.replace(/\[CONFORT:.*?\]/gi, "").trim();

    // Déterminer si une photo doit être envoyée
    let sendPhoto = botReply.includes("[PHOTO]");
    if (!sendPhoto) {
      if (userLevel >= 1.1 && userLevel < 1.7 && !photoSentAtLittleCrush) {
        sendPhoto = true;
        photoSentAtLittleCrush = true;
      } else if (userLevel >= 1.7 && userLevel < 2.2 && !photoSentAtBigCrush) {
        sendPhoto = true;
        photoSentAtBigCrush = true;
      } else if (userLevel >= 2.2 && !photoSentAtPerfectCrush) {
        sendPhoto = true;
        photoSentAtPerfectCrush = true;
      }
    }

    // Nettoyer le tag PHOTO avant d'envoyer la réponse
    botReply = botReply.replace("[PHOTO]", "").trim();

    // Préparer la réponse JSON
    let responseData = { reply: botReply };

    if (levelUpdate) {
      responseData.levelUpdateMessage = levelUpdate.message;
      responseData.levelUpdateType = levelUpdate.type;
    }

    // Ajouter une image encodée en Base64 si une photo doit être envoyée
    if (sendPhoto) {
      console.log("📸 Envoi d'une image...");

      const imageResult = await getRandomCharacterImage(isPremium, userLevel);

      if (imageResult && imageResult.image) {
        responseData.imageUrl = imageResult.image; // Image encodée en Base64
        console.log("✅ Image envoyée avec succès.");
        // Aucune mention ajoutée, ni "Image floutée" ni "Image normale"
    } else {
        console.error("⚠️ Aucune image trouvée !");
        responseData.reply += " (Désolé, aucune image disponible)"; // Conserver ce message
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
  userLevel = 1.0; // Réinitialiser le niveau utilisateur à 1.0
  photoSentAtLittleCrush = false; // Réinitialise l'état des photos
  photoSentAtBigCrush = false; // Réinitialise l'état des photos
  photoSentAtBigCrush = false; // Réinitialise l'état des photos
  photoSentAtPerfectCrush = false;
  res.json({ success: true, message: 'Niveau utilisateur réinitialisé.' });
});


// Connecter à la base de données avant de démarrer le serveur
connectToDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur lancé sur le port ${PORT}`);
  });
}).catch((err) => {
  console.error('Erreur de connexion à la base de données :', err);
});