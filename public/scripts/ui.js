import { startChat } from './chat.js';
import { resetUserLevel } from './data.js';



// ui.js
export function showLevelUpdatePopup(message, type) {
    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.textContent = message;
    popup.style.backgroundColor = type === 'up' ? 'green' : 'red';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
  }
  
  export function initializeUIEvents(sendBtn, userInput, addUserMessageHandler) {
    sendBtn.addEventListener('click', () => {
      addUserMessageHandler(userInput.value);
      userInput.value = ''; // Réinitialise l'input après envoi
    });
  
    userInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addUserMessageHandler(userInput.value);
        userInput.value = ''; // Réinitialise l'input après envoi
      }
    });
  }

 // Générer dynamiquement les options de chat
 export function generateChatOptions(characters) {
    const chatOptions = document.querySelector('.chat-options');
    chatOptions.innerHTML = ''; // Nettoyer le conteneur avant d'ajouter les options
  
    characters.forEach(character => {
      const card = document.createElement('div');
      card.className = 'chat-card';
      card.addEventListener('click', () => startChat(character.name));
  
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

  export function setupBackButton() {
    document.getElementById('back-btn').addEventListener('click', function () {
      document.querySelector('.chat-options').style.display = 'grid';
      document.getElementById('chat-box').style.display = 'none';
      document.querySelector('.header').classList.remove('hidden');
      document.querySelector('.container').classList.remove('fullscreen');
      document.querySelector('.menu').classList.remove('hidden');

      // Réinitialiser le niveau utilisateur
    resetUserLevel(); // Appeler la fonction pour remettre le niveau à 1.0

    });
  }
  export function toggleSignupModal(show) {
    const signupModal = document.getElementById('signup-modal');
    if (signupModal) {
      signupModal.classList.toggle('hidden', !show); // Affiche ou masque selon le paramètre `show`
    }
  }
  
  document.getElementById('close-signup-modal')?.addEventListener('click', () => {
    toggleSignupModal(false); // Ferme la modal quand on clique sur "Cancel"
  });