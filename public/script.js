// Sélectionner les éléments de la page
const sendBtn = document.getElementById('send-btn');
const userInput = document.getElementById('user-input');
const messages = document.getElementById('messages');
let voices = []; // Stocker les voix disponibles
let characters = []; // Stocker les personnages chargés

// Charger les données des personnages depuis characters.json
function loadCharacters() {
  fetch('/characters.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP : ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      characters = data; // Stocker les personnages pour une utilisation ultérieure
      generateChatOptions(data);
    })
    .catch(error => {
      console.error('Erreur lors du chargement des personnages :', error);
    });
}

// Générer dynamiquement les options de chat
function generateChatOptions(characters) {
  const chatOptions = document.querySelector('.chat-options');
  chatOptions.innerHTML = ''; // Nettoyer le conteneur avant d'ajouter les options

  characters.forEach(character => {
    const card = document.createElement('div');
    card.className = 'chat-card';
    card.onclick = () => startChat(character.name);

    const img = document.createElement('img');
    img.src = character.photo; // Photo du personnage depuis le JSON
    img.alt = character.name;

    const content = document.createElement('div');
    content.className = 'card-content';

    const title = document.createElement('h3');
    title.textContent = character.name;

    const description = document.createElement('p');
    description.textContent = character.description; // Utiliser le champ "description"

    content.appendChild(title);
    content.appendChild(description);
    card.appendChild(img);
    card.appendChild(content);
    chatOptions.appendChild(card);
  });
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

// Fonction pour charger et afficher les informations de la fiche de personnage en plein écran
function openProfileModal(characterName) {
  const character = characters.find(char => char.name === characterName);

  if (character) {
    document.getElementById('profile-image-full').src = character.photo;
    document.getElementById('profile-name').textContent = character.name;
    document.getElementById('profile-height').textContent = character.height;
    document.getElementById('profile-measurements').textContent = character.measurements;
    document.getElementById('profile-ethnicity').textContent = character.ethnicity;
    document.getElementById('profile-interests').textContent = character.interests.join(', ');

    document.getElementById('profile-modal').style.display = 'flex';
  } else {
    console.error('Personnage non trouvé dans characters.json');
  }
}

// Fonction pour fermer le modal de fiche de personnage
function closeProfileModal() {
  document.getElementById('profile-modal').style.display = 'none';
}

// Ajouter un écouteur de clic sur la photo de profil dans le chat
document.querySelector('.chat-profile-pic').addEventListener('click', function () {
  const currentCharacterName = document.getElementById('chat-name').textContent;
  openProfileModal(currentCharacterName);
});

// Initialiser les voix avec intervalle pour les charger dans tous les navigateurs
function initializeVoices() {
  voices = speechSynthesis.getVoices();
  if (!voices.length) {
    const interval = setInterval(() => {
      voices = speechSynthesis.getVoices();
      if (voices.length) clearInterval(interval);
    }, 100); // Vérifier toutes les 100 ms jusqu'à ce que les voix soient chargées
  }
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
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: userMessage }),
    })
      .then(response => response.json())
      .then(data => {
        // Afficher la pop-up si une mise à jour de niveau est détectée
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
        addBotMessage('Désolé, une erreur est survenue. Merci de réessayer.');
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
  imageElement.alt = 'Image générée par l\'IA';
  imageElement.classList.add('generated-image');
  botMessageElement.appendChild(imageElement);

  messages.appendChild(botMessageElement);
  messages.scrollTop = messages.scrollHeight;
}

// Fonction pour démarrer le chat et basculer en mode plein écran
function startChat(characterName) {
  const character = characters.find(c => c.name === characterName);
  if (character) {
    document.querySelector('.chat-options').style.display = 'none';
    document.getElementById('chat-box').style.display = 'flex';

    document.querySelector('.header').classList.add('hidden');
    document.querySelector('.container').classList.add('fullscreen');

    document.getElementById('chat-name').textContent = character.name;
    document.querySelector('.chat-profile-pic').src = character.photo;

    // Masquer le menu dans le chat
    document.querySelector('.menu').classList.add('hidden');
  }
}

// Gestion du bouton retour dans le chat
document.getElementById('back-btn').addEventListener('click', function () {
  document.querySelector('.chat-options').style.display = 'grid';
  document.getElementById('chat-box').style.display = 'none';
  document.querySelector('.header').classList.remove('hidden');
  document.querySelector('.container').classList.remove('fullscreen');

  // Réafficher le menu en quittant le chat
  document.querySelector('.menu').classList.remove('hidden');
});

// Modification ajoutée : Envoyer le message avec "Entrée"
userInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault(); // Empêche le comportement par défaut de "Entrée"
    addUserMessage(); // Envoie le message immédiatement
  }
});

// Modification : Fermer le clavier et envoyer directement le message avec le bouton "Envoyer"
sendBtn.addEventListener('click', () => {
  userInput.blur(); // Fermer le clavier sur mobile
  addUserMessage(); // Envoyer immédiatement le message
});

// Charger les voix lors du chargement de la page
initializeVoices();

// Charger les personnages au démarrage
loadCharacters();
