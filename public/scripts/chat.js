import { scrollToBottom } from './utils.js';
import { characters, setCharacter } from './data.js';
import { showLevelUpdatePopup, toggleSignupModal } from './ui.js';

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

        const user = JSON.parse(localStorage.getItem('user')); // Récupère les informations utilisateur
        if (!user || !user.email) {
            console.error('Utilisateur non connecté ou email manquant');
            return;
        }

        // Appeler l'API pour vérifier si l'utilisateur est premium
        fetch('http://localhost:4000/api/is-premium', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(({ isPremium }) => {
                // Faire l'appel principal après avoir récupéré le statut premium
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
                            addBotImageMessage(data.reply, data.imageUrl, isPremium, messagesContainer);
                        } else {
                            addBotMessage(data.reply, messagesContainer);
                        }

                        if (typeof scrollToBottomCallback === 'function') {
                            scrollToBottomCallback();
                        }
                    })
                    .catch(error => {
                        console.error('Erreur lors de l\'envoi du message:', error);
                        addBotMessage('Désolé, une erreur est survenue. Merci de réessayer.', messagesContainer);
                        if (typeof scrollToBottomCallback === 'function') {
                            scrollToBottomCallback();
                        }
                    });
            })
            .catch(error => {
                console.error('Erreur lors de la vérification du statut premium:', error);
                addBotMessage('Erreur lors de la vérification du statut premium. Merci de réessayer.', messagesContainer);
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

export function addBotImageMessage(botReply, imageUrl, isPremium, messagesContainer) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('bot-message');
    messageElement.textContent = botReply;

    const imageElement = document.createElement('img');
    imageElement.src = imageUrl;
    imageElement.alt = 'Image générée par l\'IA';

    if (!isPremium) {
        imageElement.classList.add('blurred-image'); // Ajoute une classe pour flouter l'image

        // Ajoute un bouton "Unlock"
        const unlockButton = document.createElement('button');
        unlockButton.textContent = 'Unlock';
        unlockButton.classList.add('unlock-button');
        unlockButton.onclick = () => {
            window.location.href = '/premium.html'; // Redirige vers la page premium
        };

        // Conteneur pour l'image et le bouton
        const imageContainer = document.createElement('div');
        imageContainer.classList.add('image-container');
        imageContainer.appendChild(imageElement);
        imageContainer.appendChild(unlockButton);

        messageElement.appendChild(imageContainer);
    } else {
        imageElement.classList.add('clear-image'); // Classe pour les images normales
        messageElement.appendChild(imageElement);
    }

    messagesContainer.appendChild(messageElement);
    scrollToBottom(messagesContainer);
}

// Fonction pour démarrer le chat et basculer en mode plein écran
export function startChat(characterName) {
    const user = JSON.parse(localStorage.getItem('user')); // Vérifiez si l'utilisateur est connecté

    if (!user) {
        toggleSignupModal(true); // Affiche la modal si non connecté
        return;
    }

    // Démarrer le chat si connecté
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
