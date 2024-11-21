import { addUserMessage, addBotMessage, addBotImageMessage } from './chat.js';
import { showLevelUpdatePopup, initializeUIEvents, setupBackButton } from './ui.js';
import { scrollToBottom } from './utils.js';
import { loadCharacters } from './data.js';
import { openProfileModal, closeProfileModal } from './profile.js';
import * as Auth from './auth.js'; // Import global pour tout auth.js

document.addEventListener('DOMContentLoaded', async () => {
  const messages = document.getElementById('messages');
  const sendBtn = document.getElementById('send-btn');
  const userInput = document.getElementById('user-input');

  // Charger les personnages
  const characters = await loadCharacters();
  console.log('Characters loaded:', characters);

  // Variable pour compter les messages de l'utilisateur
  let userMessageCount = 0;

  // Initialiser les événements UI
  initializeUIEvents(sendBtn, userInput, (message) => {
    if (message.trim() === '') return;

    const user = JSON.parse(localStorage.getItem('user')); // Vérifie si l'utilisateur est connecté
    userMessageCount++; // Incrémente le compteur de messages utilisateur

    if (!user && userMessageCount === 2) {
      // Si déconnecté et 2ème message, ouvrir la modal
      Auth.openSignupModal(); // Corrigé pour utiliser Auth.openSignupModal()
      return; // Stoppe le traitement pour empêcher l'envoi du 2ème message
    }

    // Passe le texte saisi dans le champ `userInput.value` à `addUserMessage`
    addUserMessage(message, messages, () => {
      messages.scrollTop = messages.scrollHeight;
    });
  });
});

// Ajouter un écouteur de clic sur la photo de profil dans le chat
document.querySelector('.chat-profile-pic').addEventListener('click', function () {
  const currentCharacterName = document.getElementById('chat-name').textContent;
  openProfileModal(currentCharacterName);
});

// Ajouter un écouteur de clic pour fermer le modal
document.getElementById('profile-modal').addEventListener('click', closeProfileModal);

// Ajouter un écouteur de clic pour fermer le modal via la croix
document.getElementById('close-modal-btn').addEventListener('click', closeProfileModal);

// Execute la fonction pour la flèche de retour du chat
setupBackButton();
