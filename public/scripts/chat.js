import { scrollToBottom } from './utils.js';
import { characters, setCharacter } from './data.js';
import { showLevelUpdatePopup, toggleSignupModal } from './ui.js';

let firstPhotoSent = false;
let dailyMessageCount = 0;
const DAILY_MESSAGE_LIMIT = 20;

// Définir dynamiquement l'URL de base
const BASE_URL = window.location.origin;

// Vérifie si l'utilisateur est connecté
function isUserLoggedIn() {
    const user = JSON.parse(localStorage.getItem('user')); 
    return user !== null && user.email; 
}

export function addUserMessage(userMessage, messagesContainer, scrollToBottomCallback) {
    if (userMessage.trim() !== '') {
        const messageElement = document.createElement('div');
        messageElement.textContent = userMessage;
        messageElement.classList.add('user-message');
        messagesContainer.appendChild(messageElement);

        if (typeof scrollToBottomCallback === 'function') {
            scrollToBottomCallback();
        } else {
            console.warn('scrollToBottomCallback is not a function');
        }

        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.email) {
            console.error('Utilisateur non connecté ou email manquant');
            return;
        }

        // Vérifier si l'utilisateur est premium
        fetch(`${BASE_URL}/api/is-premium`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(({ isPremium }) => {
            if (!isPremium && dailyMessageCount >= DAILY_MESSAGE_LIMIT) {
                addBotMessage(
                    `You have reached your daily message limit. <a href="premium.html" style="color: blue; text-decoration: underline;">Upgrade to premium</a> for unlimited messages.`,
                    messagesContainer
                );
                return;
            }
            

            // Appel principal au serveur
            fetch(`${BASE_URL}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

                if (!isPremium) dailyMessageCount++;

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
    messageElement.classList.add('bot-message');
    messageElement.innerHTML = botReply; // Utiliser innerHTML pour rendre le HTML dynamique
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

    if (!isPremium && firstPhotoSent) {
        imageElement.classList.add('blurred-image'); 
        const unlockButton = document.createElement('button');
        unlockButton.textContent = 'Unlock';
        unlockButton.classList.add('unlock-button');
        unlockButton.onclick = () => {
            window.location.href = '/premium.html';
        };

        const imageContainer = document.createElement('div');
        imageContainer.classList.add('image-container');
        imageContainer.appendChild(imageElement);
        imageContainer.appendChild(unlockButton);

        messageElement.appendChild(imageContainer);
    } else {
        imageElement.classList.add('clear-image');
        messageElement.appendChild(imageElement);

        if (!firstPhotoSent) firstPhotoSent = true;
    }

    messagesContainer.appendChild(messageElement);
    scrollToBottom(messagesContainer);
}

export function startChat(characterName) {
    if (!isUserLoggedIn()) {
        window.location.href = 'profile.html';
        return;
    }

    setCharacter(characterName)
    .then(() => {
        console.log(`Personnage chargé côté serveur : ${characterName}`);
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) messagesContainer.innerHTML = '';

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
    })
    .catch((error) => {
        console.error(`Erreur lors de la mise à jour du personnage côté serveur :`, error);
    });
}
