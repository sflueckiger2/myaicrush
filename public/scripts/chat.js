import { scrollToBottom } from './utils.js';
import { characters, setCharacter } from './data.js';
import { showLevelUpdatePopup, toggleSignupModal } from './ui.js';

let firstPhotoSent = false;
let dailyMessageCount = parseInt(localStorage.getItem('dailyMessageCount')) || 0;
const DAILY_MESSAGE_LIMIT = 20;
let lastMessageDate = localStorage.getItem('lastMessageDate') || new Date().toISOString().split('T')[0];

// VERIFIE SI LE JOUR A CHANGE

function resetDailyLimitIfNewDay() {
    const today = new Date().toISOString().split('T')[0];
    if (lastMessageDate !== today) {
        dailyMessageCount = 0;
        lastMessageDate = today;
        localStorage.setItem('dailyMessageCount', dailyMessageCount);
        localStorage.setItem('lastMessageDate', lastMessageDate);
    }
}
resetDailyLimitIfNewDay(); // Appelle cette fonction au démarrage



// Vérifie si l'utilisateur est connecté
function isUserLoggedIn() {
    const user = JSON.parse(localStorage.getItem('user')); // Vérifie la présence de données utilisateur dans le localStorage
    return user !== null && user.email; // Vérifie que l'utilisateur a un email valide
}

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

        // Vérifier si l'utilisateur est premium avant de continuer
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
                // Limite les messages si l'utilisateur n'est pas premium
                resetDailyLimitIfNewDay(); // Vérifie si c'est une nouvelle journée
if (!isPremium && dailyMessageCount >= DAILY_MESSAGE_LIMIT) {

                    const premiumMessage = document.createElement('div');
                    premiumMessage.innerHTML = `
                        You have reached your daily message limit. 
                        <a href="premium.html" class="premium-link">Upgrade to premium</a> for unlimited messages.
                    `;
                    premiumMessage.classList.add('bot-message');
                    messagesContainer.appendChild(premiumMessage);

                    if (typeof scrollToBottomCallback === 'function') {
                        scrollToBottomCallback();
                    }
                    return;
                }

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

                        if (!isPremium) {
                            dailyMessageCount++; // Augmente le compteur si l'utilisateur n'est pas premium
                            localStorage.setItem('dailyMessageCount', dailyMessageCount);

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

    if (!isPremium && firstPhotoSent) {
        imageElement.classList.add('blurred-image'); // Floute l'image si ce n'est pas la première photo
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

        if (!firstPhotoSent) {
            firstPhotoSent = true; // Marquer que la première photo a été envoyée
        }
    }

    messagesContainer.appendChild(messageElement);
    scrollToBottom(messagesContainer);
}

// Fonction pour démarrer le chat et basculer en mode plein écran
export function startChat(characterName) {
    // Vérifie si l'utilisateur est connecté
    if (!isUserLoggedIn()) {
        // Redirige vers la page de connexion si l'utilisateur n'est pas connecté
        window.location.href = 'profile.html';
        return;
    }

    // Informer le serveur du personnage actif
    setCharacter(characterName)
        .then(() => {
            console.log(`Personnage chargé côté serveur : ${characterName}`);

            // Réinitialiser l'historique des messages dans l'interface utilisateur
            const messagesContainer = document.getElementById('messages');
            if (messagesContainer) {
                messagesContainer.innerHTML = ''; // Efface les messages affichés
            }

            // Ensuite, démarrez le chat normalement
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
