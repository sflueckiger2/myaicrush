require('dotenv').config(); // Charger les variables d'environnement
const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const app = express(); // Initialiser l'instance d'Express
const { connectToDb, getDb } = require('./db');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';



const PORT = 3000;

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

app.use(express.json());
app.use(express.static('public')); // Servir les fichiers du dossier "public"




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



// Récupérer une image aléatoire pour le personnage actif
function getRandomCharacterImage() {
  const sanitizedCharacterName = removeAccents(activeCharacter.name.toLowerCase());
  let levelFolder;

  if (userLevel < 1.2) {
    levelFolder = `${sanitizedCharacterName}1`;
  } else if (userLevel < 1.3) {
    levelFolder = `${sanitizedCharacterName}2`;
  } else {
    levelFolder = `${sanitizedCharacterName}3`;
  }

  const imageDir = path.join(__dirname, 'public', 'images', sanitizedCharacterName, levelFolder);

  try {
    const images = fs.readdirSync(imageDir).filter(file => file.endsWith('.jpg') || file.endsWith('.png'));
    if (images.length > 0) {
      const randomImage = images[Math.floor(Math.random() * images.length)];
      return `/images/${sanitizedCharacterName}/${levelFolder}/${randomImage}`;
    } else {
      console.error(`Erreur : Aucune image trouvée dans ${imageDir}`);
      return null;
    }
  } catch (err) {
    console.error(`Erreur : Le dossier ${imageDir} est introuvable ou inaccessible.`, err);
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

  if (levelChange > 0 && userLevel > previousLevel) {
    if (userLevel === 1.1) return { message: "Level up : Little crush", type: "up" };
    if (userLevel === 1.2) return { message: "Level up : Big crush", type: "up" };
    if (userLevel === 1.3) return { message: "Level up : Perfect crush", type: "up" };
  } else if (levelChange < 0 && previousLevel > userLevel) {
    if (userLevel < 1.2) return { message: "Level down : Little crush", type: "down" };
    if (userLevel < 1.3) return { message: "Level down : Big crush", type: "down" };
  }

  return null;
}

// Endpoint principal pour gérer les messages
app.post('/message', async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ reply: "Votre message est vide. Veuillez envoyer un message valide." });
  }

  addMessageToHistory("user", userMessage);

  try {
    const userLevelDescription = userLevel >= 1.1 ? `The user is at the ${userLevel >= 1.3 ? "Perfect Crush" : "Big Crush"} level.` : "";

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

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory
    ];

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 100,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.7,
        presence_penalty: 0.5
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

    addMessageToHistory("assistant", botReply);

    const comfortLevel = extractComfortLevel(botReply);

    const levelUpdate = adjustUserLevel(comfortLevel);
    console.log('Level update:', levelUpdate); // Vérifie si un message est généré


    botReply = botReply.replace(/\[CONFORT:.*?\]/, "").trim();



    let sendPhoto = botReply.includes("[PHOTO]");

    // Ici on dit à quel niveau il faut envoyer les photos (ça doit correspondre à little crush et big crish

    if (!sendPhoto) {
      if (userLevel >= 1.1 && userLevel < 1.2 && !photoSentAtLittleCrush) {
        sendPhoto = true;
        photoSentAtLittleCrush = true;
      } else if (userLevel >= 1.2 && userLevel < 1.3 && !photoSentAtBigCrush) {
        sendPhoto = true;
        photoSentAtBigCrush = true;
      } else if (userLevel >= 1.3 && !photoSentAtPerfectCrush) {
        sendPhoto = true;
        photoSentAtPerfectCrush = true;
      }
    }
    

    botReply = botReply.replace("[PHOTO]", "").trim();

    const responseData = { reply: botReply };
    if (levelUpdate) {
      responseData.levelUpdateMessage = levelUpdate.message;
      responseData.levelUpdateType = levelUpdate.type;
      

    }
    if (sendPhoto) {
      const imageUrl = getRandomCharacterImage();
      if (imageUrl) {
        responseData.imageUrl = imageUrl;
      } else {
        responseData.reply += " (Désolé, je n'ai pas d'image à partager pour l'instant.)";
      }
    }

    res.json(responseData);
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API OpenAI:", error.response ? error.response.data : error.message);
    res.status(500).json({ reply: "Désolé, une erreur est survenue." });
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
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Erreur de connexion à la base de données :', err);
});