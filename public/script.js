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

// Fonction pour afficher la pop-up "Level up" ou "Level down"
function showLevelUpdatePopup(message, type) {
  const popup = document.createElement('div');
  popup.classList.add('popup');
  popup.textContent = message;

  // Définir la couleur de fond en fonction du type
  popup.style.backgroundColor = type === 'up' ? 'green' : 'red';

  document.body.appendChild(popup);

  // Masquer la pop-up après quelques secondes
  setTimeout(() => {
    popup.remove();
  }, 3000); // La pop-up disparaît après 3 secondes
}

// Fonction pour ajouter le message de l'utilisateur
function addUserMessage() {
  const userMessage = userInput.value.trim();

  if (userMessage !== '') {
    const messageElement = document.createElement('div');
    messageElement.textContent = `${userMessage}`;
    messageElement.classList.add('user-message');
    messages.appendChild(messageElement);
    userInput.value = '';
    messages.scrollTop = messages.scrollHeight;

    fetch('/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: userMessage })
    })
    .then(response => response.json())
    .then(data => {
      // Afficher la pop-up "Level up" ou "Level down" en fonction du type de mise à jour de niveau
      if (data.levelUpdateMessage && data.levelUpdateType) {
        showLevelUpdatePopup(data.levelUpdateMessage, data.levelUpdateType);
      }

      if (data.imageUrl) {
        addBotImageMessage(data.reply, data.imageUrl);
      } else {
        addBotMessage(data.reply);
      }
    })
    .catch(error => {
      console.error('Erreur:', error);
      addBotMessage("Désolé, une erreur est survenue. Merci de réessayer.");
    });
  }
}

// Fonction pour ajouter un message de l'IA
function addBotMessage(botReply) {
  const botMessageElement = document.createElement('div');
  botMessageElement.classList.add('bot-message');
  botMessageElement.textContent = botReply;
  messages.appendChild(botMessageElement);
  messages.scrollTop = messages.scrollHeight;
}

// Fonction pour ajouter un message de l'IA avec une image
function addBotImageMessage(botReply, imageUrl) {
  const botMessageElement = document.createElement('div');
  botMessageElement.classList.add('bot-message');
  botMessageElement.textContent = botReply;

  const imageElement = document.createElement('img');
  imageElement.src = imageUrl;
  imageElement.alt = "Image générée par l'IA";
  imageElement.classList.add('generated-image');
  botMessageElement.appendChild(imageElement);

  messages.appendChild(botMessageElement);
  messages.scrollTop = messages.scrollHeight;
}

// Fonction pour démarrer le chat et basculer en mode plein écran
function startChat(option) {
  // Masquer les options de chat et afficher le chat-box
  document.querySelector(".chat-options").style.display = "none";
  document.getElementById("chat-box").style.display = "flex";

  // Masquer le titre et agrandir le conteneur
  document.querySelector(".header").classList.add("hidden");
  document.querySelector(".container").classList.add("fullscreen");

  // Affiche le nom "Hanaé" pour le chat principal
  document.getElementById("chat-name").textContent = option === "Hanaé" ? "Hanaé" : option;

  // Mettre à jour l'image de profil selon l'option sélectionnée
  document.querySelector(".chat-profile-pic").src = option === "Hanaé" ? "images/hanae/hanae_profil_pic.jpg" :
                                                    option === "Friendly AI" ? "avatar2.png" :
                                                    option === "Adventurous AI" ? "avatar3.png" : "avatar4.png";
}

document.getElementById('back-btn').addEventListener('click', function() {
  // Réaffiche les options de chat
  document.querySelector('.chat-options').style.display = 'grid';

  // Masque la zone de chat
  document.getElementById('chat-box').style.display = 'none';

  // Réaffiche le header
  document.querySelector('.header').classList.remove('hidden');

  // Retire le mode plein écran
  document.querySelector('.container').classList.remove('fullscreen');
});


// Ajouter un événement au bouton d'envoi
sendBtn.addEventListener('click', addUserMessage);

// Charger les voix lors du chargement de la page
initializeVoices();
