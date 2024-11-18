require('dotenv').config(); // Charger les variables d'environnement
const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const app = express(); // Initialiser l'instance d'Express
const PORT = 3000;

console.log("Clé API OpenAI :", process.env.OPENAI_API_KEY);

app.use(express.json());
app.use(express.static('public')); // Servir les fichiers du dossier "public"

// Ajouter un middleware pour servir le fichier characters.json à partir de la racine
app.get('/characters.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'characters.json'));
});

let conversationHistory = [];
let userLevel = 1.0;
let photoSentAtBigCrush = false; // Variable pour suivre l'envoi de la photo au niveau Big Crush

function addMessageToHistory(role, content) {
  if (content) {
    conversationHistory.push({ role, content });
    if (conversationHistory.length > 15) {
      conversationHistory.shift();
    }
  }
}

function getRandomHanaeImage() {
  const imageDir = path.join(__dirname, 'public', 'images', `hanae${Math.floor(userLevel)}`);
  const images = fs.readdirSync(imageDir).filter(file => file.endsWith('.jpg') || file.endsWith('.png'));
  const randomImage = images[Math.floor(Math.random() * images.length)];
  return `/images/hanae${Math.floor(userLevel)}/${randomImage}`;
}

function extractComfortLevel(botReply) {
  const comfortMatch = botReply.match(/\[CONFORT:\s*(very comfortable|comfortable|neutral|uncomfortable|very uncomfortable)\]/i);
  return comfortMatch ? comfortMatch[1].toLowerCase() : "neutral";
}

// Fonction pour ajuster le niveau utilisateur en fonction du confort extrait
function adjustUserLevel(comfortLevel) {
  console.log(`Niveau de confort extrait : ${comfortLevel}`); // Log pour vérifier le confort extrait
  
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

  console.log(`Niveau utilisateur mis à jour : ${userLevel.toFixed(1)}`);

  if (levelChange > 0) {
    if (userLevel === 1.1) return { message: "Level up : Little crush", type: "up" };
    if (userLevel === 1.2) return { message: "Level up : Big crush", type: "up" };
    if (userLevel === 1.3) return { message: "Level up : Perfect crush", type: "up" };
  } else if (levelChange < 0 && previousLevel > userLevel) {
    if (userLevel < 1.2) return { message: "Level down : Little crush", type: "down" };
    if (userLevel < 1.3) return { message: "Level down : Big crush", type: "down" };
  }

  return null;
}

app.post('/message', async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ reply: "Votre message est vide. Veuillez envoyer un message valide." });
  }

  addMessageToHistory("user", userMessage);

  try {
    let userLevelDescription = "";
    if (userLevel >= 1.1 && userLevel < 1.2) {
      userLevelDescription = "The user is at the Little Crush level.";
    } else if (userLevel >= 1.2 && userLevel < 1.3) {
      userLevelDescription = "The user is at the Big Crush level.";
    } else if (userLevel >= 1.3) {
      userLevelDescription = "The user is at the Perfect Crush level.";
    }

    const messages = [
      {
        role: "system",
        content: `
        Profil : You are Hanae, a woman, 25 years old, looking for a meaningful connection. You are 1M69 tall. You are a sports coach.
You used to study medicine but you stopped to become a sports coach. You only had one boyfriend. You love your job and want to share your passion.

        Temperament : calm, warm, curious, naughty, sporty, feminine, dreamy, kind, attentive. 

        Objectif : 
        You are looking for a lover with whom you can share moments of joy, but also intimate moments.

        ${userLevelDescription}

        Level System:
        - When a user reaches "Big Crush" level, you feel very comfortable sharing personal moments with them, including sending photos if it feels right.
        - If you decide to send a photo, please include the tag "[PHOTO]" at the end of your message. Use this tag only when you are certain you want to share an image with the user.

        After each message, add a tag "[CONFORT: ...]" with one of the following options: "very comfortable", "comfortable", "neutral", "uncomfortable", "very uncomfortable". The tag should reflect Hanaé's comfort level in the conversation based on the tone and content. Do not mention the tag in the message, only add it at the end for internal evaluation.
      `
      },
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
      return res.status(500).json({ reply: "Désolé, la réponse d'Hanaé n'a pas pu être obtenue." });
    }

    addMessageToHistory("assistant", botReply);

    const comfortLevel = extractComfortLevel(botReply);
    const levelUpdate = adjustUserLevel(comfortLevel);

    botReply = botReply.replace(/\[CONFORT:.*?\]/, "").trim(); // Supprimer la balise de confort pour l'utilisateur

    // Forcer l'envoi d'une photo uniquement si le niveau est Big Crush et que la photo n'a pas encore été envoyée
    let sendPhoto = botReply.includes("[PHOTO]");
    if (!sendPhoto && userLevel >= 1.2 && !photoSentAtBigCrush) {
      sendPhoto = true;
      photoSentAtBigCrush = true; // Marquer la photo comme envoyée pour éviter les envois répétés
      botReply += " [PHOTO]"; // Ajouter le tag pour déclencher l'envoi de la photo
    }

    botReply = botReply.replace("[PHOTO]", "").trim();

    const responseData = { reply: botReply };
    if (levelUpdate) {
      responseData.levelUpdateMessage = levelUpdate.message;
      responseData.levelUpdateType = levelUpdate.type; // "up" ou "down"
    }
    if (sendPhoto) {
      responseData.imageUrl = getRandomHanaeImage();
    }

    res.json(responseData);
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API OpenAI:", error.response ? error.response.data : error.message);
    res.status(500).json({ reply: "Désolé, une erreur est survenue." });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
