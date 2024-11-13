require('dotenv').config(); // Charger les variables d'environnement
const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

console.log("Clé API OpenAI :", process.env.OPENAI_API_KEY);

app.use(express.json());
app.use(express.static('public'));

// Variables pour stocker l'historique de la conversation et le niveau utilisateur
let conversationHistory = [];        // Historique complet pour l'IA
let userMessageHistory = [];         // Historique distinct pour les messages utilisateurs
let userLevel = 1;                   // Niveau initial de l'utilisateur

// Fonction pour sélectionner une image aléatoire en fonction du niveau de l'utilisateur
function getRandomHanaeImage() {
  // Définir le dossier d'images en fonction du niveau
  const imageDir = path.join(__dirname, 'public', 'images', `hanae${userLevel}`);
  const images = fs.readdirSync(imageDir).filter(file => file.endsWith('.jpg') || file.endsWith('.png'));

  // Sélectionne une image aléatoire
  const randomImage = images[Math.floor(Math.random() * images.length)];
  return `/images/hanae${userLevel}/${randomImage}`;
}

// Fonction pour ajouter un message à l'historique complet et à l'historique utilisateur
function addMessageToHistory(role, content) {
  // Filtrer les messages génériques : très courts ou répétitifs
  const isShortMessage = content.split(" ").length <= 3; // Messages de 3 mots ou moins
  const isRepeated = conversationHistory.some(message => message.content === content);

  // Ajouter le message à l'historique complet pour l'IA
  if (!(isShortMessage || isRepeated) || role === "user") {
    conversationHistory.push({ role, content });
    if (role === "user") {
      userMessageHistory.push(content); // Ajouter uniquement le message utilisateur à l'historique utilisateur
    }
  }

  // Limiter l'historique complet pour l'IA sans toucher l'historique utilisateur
  if (conversationHistory.length > 15) {
    conversationHistory.shift();
  }

  // Appeler la fonction de mise à jour du niveau en utilisant l'historique utilisateur
  updateUserLevel();
}

// Fonction pour gérer la progression de niveau basée sur le nombre de messages utilisateur
function updateUserLevel() {
  // Définir le niveau en fonction du nombre de messages utilisateur dans userMessageHistory
  const userMessagesCount = userMessageHistory.length;
  
  if (userMessagesCount > 10) {
    userLevel = 3;
  } else if (userMessagesCount > 5) {
    userLevel = 2;
  } else {
    userLevel = 1;
  }

  console.log(`Niveau utilisateur mis à jour : Niveau ${userLevel} | Messages utilisateur : ${userMessagesCount}`);
}

// Liste de mots-clés "photo" en plusieurs langues
const keywords = [
  "photo", "image", "montre-moi", "show me", "picture", "foto", "Bild", "写真", "사진", "图片", "عکس", "фото", "imagem", "ছবি", "تصویر", "รูปภาพ"
];

// Route pour gérer les messages de l'utilisateur
app.post('/message', async (req, res) => {
  const userMessage = req.body.message;

  // Ajouter le message de l'utilisateur à l'historique
  addMessageToHistory("user", userMessage);

  try {
    // Préparer les messages pour le modèle avec le prompt initial et l'historique limité
    const messages = [
      { role: "system", content: `
        Profil : You are Hanae, a woman, 25 years old, looking for a meaningful connection. You are 1M69 tall and you are 80D. You are a sports coach.

        Temperament : calm, warm, curious, naughty, sporty, feminine, dreamy, kind, attentive, you like 18cm penises, your ex had a 13cm penis, too small for you

        Objectif : 
        You are looking for a lover with whom you can share moments of joy, but also intimate moments.

        In case of sensitive content : Still try to talk about sensitive things with your partner, whether surprised in a good way, or curious when he reveals intimate things to you. Ask to know more. If he really goes too far for you, you can offer him a slightly naughty photo.

        In conversation:
        Avoid repeating yourself, remember what you talked about with your partner. If possible, simply answer these questions, without necessarily always asking a question for each sentence you write.
      `},
      ...conversationHistory
    ];

    // Envoyer le message de l'utilisateur et l'historique à l'API d'OpenAI avec les nouveaux paramètres
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 100,
        temperature: 0.7,          // Équilibre entre créativité et cohérence
        top_p: 0.9,                // Diversité tout en maintenant la cohérence
        frequency_penalty: 0.7,    // Limite les répétitions dans la conversation
        presence_penalty: 0.5      // Encourage l'exploration de nouveaux thèmes
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    // Extraire la réponse de l'IA et l'ajouter à l'historique complet
    const botReply = response.data.choices[0].message.content;
    addMessageToHistory("assistant", botReply);

    // Vérifie si le message de l'utilisateur contient un mot-clé pour demander une image
    const requestImage = keywords.some(keyword => userMessage.toLowerCase().includes(keyword));

    // Si l'utilisateur demande une image, ajoute une image aléatoire en fonction du niveau
    if (requestImage) {
      const imageUrl = getRandomHanaeImage();
      res.json({ reply: botReply, imageUrl: imageUrl });
    } else {
      res.json({ reply: botReply });
    }

  } catch (error) {
    console.error("Erreur lors de l'appel à l'API OpenAI:", error.response ? error.response.data : error.message);
    res.status(500).json({ reply: "Désolé, une erreur est survenue." });
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
