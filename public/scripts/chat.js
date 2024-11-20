// chat.js
import { scrollToBottom } from './utils.js';
import { characters } from './data.js';
import { showLevelUpdatePopup } from './ui.js';

export function addUserMessage(userMessage, messagesContainer, scrollToBottomCallback) {
    if (userMessage.trim() !== '') {
      const messageElement = document.createElement('div');
      messageElement.textContent = userMessage;
      messageElement.classList.add('user-message');
      messagesContainer.appendChild(messageElement);
  
      // Appeler scrollToBottomCallback si c'est une fonction
      if (typeof scrollToBottomCallback === 'function') {
        scrollToBottomCallback();
      } else {
        console.warn('scrollToBottomCallback is not a function');
      }
  
      fetch('/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.levelUpdateMessage && data.levelUpdateType) {
            showLevelUpdatePopup(data.levelUpdateMessage, data.levelUpdateType);
          }
  
          if (data.imageUrl) {
            addBotImageMessage(data.reply, data.imageUrl, messagesContainer);
          } else {
            addBotMessage(data.reply, messagesContainer);
          }
  
          if (typeof scrollToBottomCallback === 'function') {
            scrollToBottomCallback();
          }
        })
        .catch(error => {
          console.error('Erreur:', error);
          addBotMessage('Désolé, une erreur est survenue. Merci de réessayer.', messagesContainer);
          if (typeof scrollToBottomCallback === 'function') {
            scrollToBottomCallback();
          }
        });
    }
  }
  

export function addBotMessage(botReply, messagesContainer) {
  const messageElement = document.createElement('div');
  messageElement.textContent = botReply;
  messageElement.classList.add('bot-message');
  messagesContainer.appendChild(messageElement);
  scrollToBottom(messagesContainer);
}

export function addBotImageMessage(botReply, imageUrl, messagesContainer) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('bot-message');
  messageElement.textContent = botReply;

  const imageElement = document.createElement('img');
  imageElement.src = imageUrl;
  imageElement.alt = 'Image générée par l\'IA';
  imageElement.classList.add('generated-image');

  messageElement.appendChild(imageElement);
  messagesContainer.appendChild(messageElement);
  scrollToBottom(messagesContainer);
}
// Fonction pour démarrer le chat et basculer en mode plein écran
export function startChat(characterName) {
    const character = characters.find(c => c.name === characterName);
    if (character) {
      document.querySelector('.chat-options').style.display = 'none';
      document.getElementById('chat-box').style.display = 'flex';
  
      document.querySelector('.header').classList.add('hidden');
      document.querySelector('.container').classList.add('fullscreen');
  
      document.getElementById('chat-name').textContent = character.name;
      document.querySelector('.chat-profile-pic').src = character.photo;
  
      document.querySelector('.menu').classList.add('hidden');
    }
  }
  