// Sélectionner les éléments de la page
const sendBtn = document.getElementById('send-btn');
const userInput = document.getElementById('user-input');
const messages = document.getElementById('messages');
let voices = []; // Stocker les voix disponibles

// Initialiser les voix avec intervalle pour les charger dans tous les navigateurs
function initializeVoices() {
  voices = speechSynthesis.getVoices();
  if (!voices.length) {
    const interval = setInterval(() => {
      voices = speechSynthesis.getVoices();
      if (voices.length) clearInterval(interval); // Arrêter une fois les voix chargées
    }, 100); // Vérifier toutes les 100 ms jusqu'à ce que les voix soient chargées
  }
}

// Fonction pour ajouter un indicateur "is typing"
function showTypingIndicator() {
  const typingIndicator = document.createElement('div');
  typingIndicator.classList.add('typing-indicator');
  typingIndicator.textContent = 'Hanaé est en train d’écrire';
  typingIndicator.id = 'typing-indicator';
  messages.appendChild(typingIndicator);
  messages.scrollTop = messages.scrollHeight;
}

// Fonction pour retirer l'indicateur "is typing"
function hideTypingIndicator() {
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// Fonction pour détecter la langue du texte
function detectLanguage(text) {
  const sampleFrenchWords = /[àâçéèêëîïôûùüÿœ]| le | la | je | tu | vous | un | une /i;
  const sampleSpanishWords = /[ñáéíóú]| el | la | tú | usted | un | una /i;
  const sampleGermanWords = /ß| der | die | ich | du | wir | ein | eine /i;
  const sampleJapaneseWords = /[\u3040-\u30FF]/; // Kanji, Hiragana, Katakana
  
  if (sampleFrenchWords.test(text)) return 'fr-FR';
  if (sampleSpanishWords.test(text)) return 'es-ES';
  if (sampleGermanWords.test(text)) return 'de-DE';
  if (sampleJapaneseWords.test(text)) return 'ja-JP';
  return 'en-US'; // Par défaut, anglais
}

// Fonction pour faire parler Hanaé avec une voix adaptée à la langue détectée
function speakMessage(text) {
  if ('speechSynthesis' in window) {
    const speech = new SpeechSynthesisUtterance(text);

    // Détecter la langue du texte
    const targetLang = detectLanguage(text);

    // Filtrer les voix disponibles pour correspondre à la langue détectée
    const selectedVoice = voices.find(voice => voice.lang === targetLang) || voices[0]; // Voix par défaut si aucune ne correspond

    // Appliquer la voix et les paramètres de tonalité
    speech.voice = selectedVoice;
    speech.lang = targetLang;
    speech.pitch = 1.7; // Ton doux
    speech.rate = 1.1; // Vitesse plus lente

    // Lire le message
    speechSynthesis.speak(speech);
  } else {
    console.log("L'API Web Speech n'est pas supportée par ce navigateur.");
  }
}

// Fonction pour ajouter le message de l'utilisateur
function addUserMessage() {
  const userMessage = userInput.value.trim();

  if (userMessage !== '') {
    const messageElement = document.createElement('div');
    messageElement.textContent = `Vous: ${userMessage}`;
    messageElement.classList.add('user-message');
    messages.appendChild(messageElement);
    userInput.value = '';
    messages.scrollTop = messages.scrollHeight;

    showTypingIndicator();

    fetch('/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: userMessage })
    })
    .then(response => response.json())
    .then(data => {
      const typingDelay = Math.floor(Math.random() * 2000) + 3000;
      setTimeout(() => {
        hideTypingIndicator();

        if (data.imageUrl) {
          addBotImageMessage(data.reply, data.imageUrl);
        } else {
          addBotMessage(data.reply);
        }
      }, typingDelay);
    })
    .catch(error => {
      console.error('Erreur:', error);
      hideTypingIndicator();
      addBotMessage("Désolé, une erreur est survenue. Merci de réessayer.");
    });
  }
}

// Fonction pour ajouter un message de l'IA (texte seulement) avec un bouton de lecture
function addBotMessage(botReply) {
  const botMessageElement = document.createElement('div');
  botMessageElement.classList.add('bot-message');

  const messageText = document.createElement('span');
  messageText.textContent = `IA: ${botReply}`;
  botMessageElement.appendChild(messageText);

  const audioButton = document.createElement('button');
  audioButton.textContent = "🔊";
  audioButton.classList.add('audio-button');
  audioButton.onclick = () => speakMessage(botReply);
  botMessageElement.appendChild(audioButton);

  messages.appendChild(botMessageElement);
  messages.scrollTop = messages.scrollHeight;
}

// Fonction pour ajouter un message de l'IA avec une image
function addBotImageMessage(botReply, imageUrl) {
  const botMessageElement = document.createElement('div');
  botMessageElement.classList.add('bot-message');

  const messageText = document.createElement('span');
  messageText.textContent = `IA: ${botReply}`;
  botMessageElement.appendChild(messageText);

  const audioButton = document.createElement('button');
  audioButton.textContent = "🔊";
  audioButton.classList.add('audio-button');
  audioButton.onclick = () => speakMessage(botReply);
  botMessageElement.appendChild(audioButton);

  const imageElement = document.createElement('img');
  imageElement.src = imageUrl;
  imageElement.alt = "Image générée par l'IA";
  imageElement.classList.add('generated-image');
  botMessageElement.appendChild(imageElement);

  messages.appendChild(botMessageElement);
  messages.scrollTop = messages.scrollHeight;
}

// Ajouter un événement au bouton d'envoi
sendBtn.addEventListener('click', addUserMessage);

// Permettre d'envoyer avec la touche Entrée
userInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    addUserMessage();
  }
});

// Charger les voix lors du chargement de la page
initializeVoices();
