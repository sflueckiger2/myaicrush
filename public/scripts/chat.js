import { scrollToBottom } from './utils.js';
import { characters, setCharacter } from './data.js';
import { showLevelUpdatePopup, toggleSignupModal } from './ui.js';

let firstPhotoSent = false;
let dailyMessageCount = 0;
const DAILY_MESSAGE_LIMIT = 8;

// Définir dynamiquement l'URL de base
const BASE_URL = window.location.origin;

const toggleMode = document.getElementById("toggleMode");

if (toggleMode) { // ✅ Vérifie que l'élément existe avant de modifier ses propriétés
    const currentMode = localStorage.getItem("chatMode") || "image";
    toggleMode.checked = currentMode === "gif";

    toggleMode.addEventListener("change", () => {
        const newMode = toggleMode.checked ? "gif" : "image";
        localStorage.setItem("chatMode", newMode);
        console.log(`🎬 Mode changé : ${newMode}`);
    });
} else {
    console.warn("⚠️ 'toggleMode' non trouvé sur cette page.");
}




// Vérifie si l'utilisateur est connecté
function isUserLoggedIn() {
    const user = JSON.parse(localStorage.getItem('user')); 
    console.log("🔍 Utilisateur récupéré depuis localStorage :", user);

    return user !== null && user.email; 
}

//Fonction Google analytics 

function trackCharacterSelection(characterName) {
    gtag('event', 'select_character', {
        character_name: characterName
    });
    console.log(`📊 Suivi GA4 : ${characterName} sélectionné`);
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
                    `Tu as dépassé ta limite de messages gratuits. <a href="premium.html" style="color: blue; text-decoration: underline;">Deviens un membre Premium</a> pour débloquer les messages illimités.`,
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
                    email: user?.email, 
                    mode: localStorage.getItem("chatMode") || "image" // ✅ Ajout du mode
                }),
                
            })
            .then(response => response.json())
            .then(data => {
                console.log("🔍 Réponse reçue du serveur :", data); // ✅ Vérification de isBlurred
                hideTypingIndicator(); // Masque l'indicateur après réception de la réponse

                if (data.levelUpdateMessage && data.levelUpdateType) {
                    showLevelUpdatePopup(data.levelUpdateMessage, data.levelUpdateType);
                }

                if (data.imageUrl) {
                    console.log(`📌 Image reçue : ${data.imageUrl} - Floutée : ${data.isBlurred}`);

                    // ✅ Passe l'info "isBlurred" si elle est envoyée par le backend
                    addBotImageMessage(data.reply, data.imageUrl, isPremium, messagesContainer, data.isBlurred);
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


export function addBotImageMessage(botReply, imageUrl, isPremium, messagesContainer, isBlurredFromBackend = null) {
    console.log("🖼️ Ajout d'une image au chat...");
    console.log(`📌 Image URL reçue : ${imageUrl}`);
    console.log(`🔎 isBlurred reçu du backend : ${isBlurredFromBackend}`);

    const messageElement = document.createElement('div');
    messageElement.classList.add('bot-message');
    messageElement.textContent = botReply;

    const imageElement = document.createElement('img');
    imageElement.src = `${BASE_URL}${imageUrl}`;
    imageElement.alt = 'Image générée par l\'IA';
    imageElement.classList.add('chat-image');

    // 🔥 Déterminer si l'image est réellement floutée
    let isBlurred = isBlurredFromBackend !== null ? isBlurredFromBackend : imageUrl.includes('/get-image/');

    console.log(`📌 Image est floutée ? ${isBlurred}`);

    // ✅ Afficher le bouton seulement si l'image est vraiment floutée
    if (!isPremium && isBlurred) {
        console.log("💨 Image détectée comme floutée, ajout du bouton Unlock.");
        
        const imageContainer = document.createElement('div');
        imageContainer.classList.add('image-container');

        // ✅ Ajouter le bouton Unlock
        const unlockButton = document.createElement('button');
        unlockButton.textContent = 'Retirer le flou';
        unlockButton.classList.add('unlock-button');
        unlockButton.onclick = () => {
            window.location.href = '/premium.html';
        };

        imageContainer.appendChild(imageElement);
        imageContainer.appendChild(unlockButton);
        messageElement.appendChild(imageContainer);
    } else {
        console.log("🌟 Image claire affichée, pas de bouton.");
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
        
        // ✅ Ajouter l'événement Google Analytics ici
        trackCharacterSelection(characterName);
        
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

            // ✅ FORCER LE MODE IMAGE PAR DÉFAUT À CHAQUE CHANGEMENT DE PERSONNAGE
            const toggleMode = document.getElementById("toggleMode");
            const modeToggleContainer = document.getElementById("mode-toggle-container");
            const videoTag = document.getElementById("video-available"); // Sélecteur pour l'encart vidéo

            if (toggleMode && modeToggleContainer) {
                localStorage.setItem("chatMode", "image"); // Réinitialiser à "image"
                toggleMode.checked = false; // Désactiver le toggle (donc mode image)

                // ✅ AFFICHER OU CACHER LE BOUTON TOGGLE
                if (character.hasVideos) {
                    modeToggleContainer.style.display = "block"; // Afficher le toggle
                    console.log("🎬 Le personnage a des vidéos, affichage du toggle.");
                } else {
                    modeToggleContainer.style.display = "none"; // Cacher le toggle
                    console.log("📸 Aucun GIF disponible, on cache le toggle.");
                }
            }

            // ✅ AFFICHER OU CACHER L'ENCART VIDÉO
            if (videoTag) {
                if (character.hasVideos) {
                    videoTag.style.display = "block"; // Afficher l'encart
                    console.log("📢 Vidéos disponibles, affichage de l'encart.");
                } else {
                    videoTag.style.display = "none"; // Cacher l'encart
                    console.log("🚫 Aucune vidéo disponible, encart caché.");
                }
            }
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


// Fonction pour envoi IMAGE par utilisateur


// ✅ Vérifier que le bouton existe avant d'ajouter l'event listener
const uploadBtn = document.getElementById("upload-btn");
if (uploadBtn) {
    uploadBtn.addEventListener("click", async () => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.email) {
            alert("Vous devez être connecté pour envoyer une image.");
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/api/is-premium`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user.email }),
            });

            const { isPremium } = await response.json();
            if (!isPremium) {
                window.location.href = "premium.html";
                return;
            }

            const imageInput = document.getElementById("image-input");
            if (imageInput) imageInput.click();
        } catch (error) {
            console.error("❌ Erreur lors de la vérification du statut premium :", error);
            alert("Erreur lors de la vérification de votre compte. Veuillez réessayer.");
        }
    });
}

// ✅ Vérifier que l'input image existe avant d'ajouter l'event listener
const imageInput = document.getElementById("image-input");
if (imageInput) {
    imageInput.addEventListener("change", async function () {
        const file = this.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.email) {
            alert("Vous devez être connecté pour envoyer une image.");
            return;
        }

        const messagesContainer = document.getElementById("messages");
        if (!messagesContainer) return;

        const tempImageElement = document.createElement("div");
        tempImageElement.innerHTML = `<p>📤 Envoi en cours...</p>`;
        messagesContainer.appendChild(tempImageElement);
        scrollToBottom(messagesContainer);

        try {
            const response = await fetch(`${BASE_URL}/upload-image`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            if (data.imageUrl) {
                tempImageElement.innerHTML = ""; 
                const imageMessageElement = document.createElement("div");
                imageMessageElement.classList.add("user-message", "image-message");

                const imageElement = document.createElement("img");
                imageElement.src = data.imageUrl;
                imageElement.alt = "Image envoyée";
                imageElement.style.maxWidth = "200px";
                imageElement.style.borderRadius = "10px";

                imageMessageElement.appendChild(imageElement);
                messagesContainer.appendChild(imageMessageElement);
                scrollToBottom(messagesContainer);

                imageInput.value = "";

                const iaResponse = await fetch(`${BASE_URL}/message`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        message: "[PHOTO ENVOYÉE]", 
                        email: user.email 
                    }),
                });

                const iaData = await iaResponse.json();
                console.log("🔍 Réponse IA après envoi d’image :", iaData);

                if (iaData.reply) addBotMessage(iaData.reply, messagesContainer);
                if (iaData.imageUrl) addBotImageMessage(iaData.reply, iaData.imageUrl, isPremium, messagesContainer, iaData.isBlurred);

                scrollToBottom(messagesContainer);
            } else {
                tempImageElement.innerHTML = `<p>❌ Échec de l’envoi</p>`;
            }
        } catch (error) {
            console.error("❌ Erreur lors de l'envoi de l'image :", error);
            tempImageElement.innerHTML = `<p>❌ Erreur</p>`;
        }
    });
}

