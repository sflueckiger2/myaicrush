import { scrollToBottom } from './utils.js';
import { characters, setCharacter } from './data.js';
import { showLevelUpdatePopup, toggleSignupModal } from './ui.js';

let firstPhotoSent = false;
let dailyMessageCount = 0;
const DAILY_MESSAGE_LIMIT = 8;

// Définir dynamiquement l'URL de base
const BASE_URL = window.location.origin;

// Vérifie si l'utilisateur est connecté
function isUserLoggedIn() {
    const user = JSON.parse(localStorage.getItem('user')); 
    console.log("🔍 Utilisateur récupéré depuis localStorage :", user);

    return user !== null && user.email; 
}

export function addUserMessage(userMessage, messagesContainer, scrollToBottomCallback) {
    if (userMessage.trim() !== '') {
        const messageElement = document.createElement('div');
        messageElement.textContent = userMessage;
        messageElement.classList.add('user-message');
        messagesContainer.appendChild(messageElement);

        if (typeof scrollToBottomCallback === 'function') {
            scrollToBottomCallback(messagesContainer);
        }

        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.email) {
            console.error('Utilisateur non connecté ou email manquant');
            return;
        }

        // Afficher l'indicateur de saisie
        simulateTypingIndicator(messagesContainer);

        console.log("📨 Envoi du message avec :", { 
            message: userMessage, 
            email: user?.email // Vérifie si email est défini
        });
        
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
                body: JSON.stringify({ 
                    message: userMessage, 
                    email: user?.email // 🔥 Ajoute l'email ici !
                }),
            })
            
            .then(response => response.json())
            .then(data => {
                hideTypingIndicator(); // Masque l'indicateur après réception de la réponse

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
                    scrollToBottomCallback(messagesContainer);
                }
            })
            .catch(error => {
                console.error('Erreur lors de l\'envoi du message:', error);
                hideTypingIndicator(); // Masque en cas d'erreur
                addBotMessage('Désolé, une erreur est survenue. Merci de réessayer.', messagesContainer);
            });
        })
        .catch(error => {
            console.error('Erreur lors de la vérification du statut premium:', error);
            hideTypingIndicator(); // Masque en cas d'erreur
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
    imageElement.src = `${BASE_URL}${imageUrl}`; // Charge l’image via l’endpoint sécurisé
    imageElement.alt = 'Image générée par l\'IA';
    imageElement.classList.add('chat-image'); // 🔥 Ajout d'une classe pour éviter le dépassement

    // Vérifier si c'est la première image envoyée à un non-premium
    if (!isPremium && !firstPhotoSent) {
        console.log("🎁 Première image non floutée affichée !");
        firstPhotoSent = true; // Marquer qu'une image a été envoyée sans flou
        messageElement.appendChild(imageElement);
    } else if (!isPremium) {
        console.log("💨 Image floutée affichée pour un utilisateur non premium.");
        imageElement.classList.add('blurred-image');

        // Ajouter le bouton "Unlock"
        const unlockButton = document.createElement('button');
        unlockButton.textContent = 'Unlock';
        unlockButton.classList.add('unlock-button');
        unlockButton.onclick = () => {
            window.location.href = '/premium.html'; // Rediriger vers la page premium
        };

        // Conteneur pour l'image + bouton
        const imageContainer = document.createElement('div');
        imageContainer.classList.add('image-container');
        imageContainer.appendChild(imageElement);
        imageContainer.appendChild(unlockButton); // Ajouter le bouton

        messageElement.appendChild(imageContainer);
    } else {
        console.log("🌟 Image claire affichée pour un premium.");
        imageElement.classList.add('clear-image');
        messageElement.appendChild(imageElement);
    }

    messagesContainer.appendChild(messageElement);
    scrollToBottom(messagesContainer);
}





// Exemple d'utilisation : Ajouter après l'envoi d'un message utilisateur
const sendBtn = document.getElementById('send-btn');
if (sendBtn) {
    sendBtn.addEventListener('click', () => {
        const userMessage = userInput.value.trim();
        if (userMessage !== '') {
            addUserMessage();
            simulateTypingDelay(); // Simule la saisie pendant 2 secondes
        }
    });
} else {
    console.warn("send-btn n'est pas présent sur cette page.");
}



// fonction resize clavier

function adjustChatHeight() {
    const chatBox = document.getElementById('chat-box');
  
    if (!chatBox) return;
  
    // Calculer la hauteur visible du viewport
    const viewportHeight = window.innerHeight;
  
    // Appliquer la hauteur dynamique
    chatBox.style.height = `${viewportHeight}px`;
  }
  
  // Appeler la fonction au chargement initial
  adjustChatHeight();
  
  // Réagir aux changements de taille de la fenêtre (clavier qui s'affiche)
  window.addEventListener('resize', adjustChatHeight);
  

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

//fonctions is typing

function showTypingIndicator(messagesContainer) {
    const typingIndicator = document.getElementById('typing-indicator');
    if (!typingIndicator) {
        console.error('Typing indicator not found.');
        return;
    }
    typingIndicator.classList.remove('hidden'); // Affiche l'indicateur
    messagesContainer.appendChild(typingIndicator); // Ajoute l'indicateur dans le conteneur des messages
    scrollToBottom(messagesContainer); // Fait défiler vers le bas
}


function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (!typingIndicator) {
        console.error('Typing indicator not found.');
        return;
    }
    typingIndicator.classList.add('hidden'); // Masque l'indicateur
}


function simulateTypingIndicator(messagesContainer) {
    // Générer un délai aléatoire entre 2 et 4 secondes
    const delay = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000;

    showTypingIndicator(messagesContainer); // Affiche l'indicateur

    // Masque l'indicateur après le délai
    setTimeout(() => {
        hideTypingIndicator();
    }, delay);
}


export function resetChatState() {
    // Effacer l'historique des messages affichés
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    } else {
        console.warn('Messages container not found.');
    }

    // Réinitialiser les événements du chat
    if (typeof resetChatEventListeners === 'function') {
        resetChatEventListeners();
    } else {
        console.error('resetChatEventListeners is not defined.');
    }

    // Vérifier si l'indicateur de saisie existe
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.classList.add('hidden'); // Masquer si présent
    } else {
        console.warn('Typing indicator not found. Recreating it...');
        recreateTypingIndicator(); // Recrée l'indicateur si nécessaire
    }

    console.log('Chat state has been reset.');
}

function recreateTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typing-indicator';
    typingIndicator.classList.add('hidden'); // Masqué par défaut

    // Ajouter les trois points pour l'effet "is typing"
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        typingIndicator.appendChild(dot);
    }

    const chatBox = document.getElementById('chat-box');
    if (chatBox) {
        chatBox.appendChild(typingIndicator);
        console.log('Typing indicator recreated.');
    } else {
        console.error('Chat box not found. ');
    }
}
