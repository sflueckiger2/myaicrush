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

        // ✅ Afficher l'indicateur de saisie immédiatement
        showTypingIndicator(messagesContainer);

        console.log("📨 Envoi du message avec :", { 
            message: userMessage, 
            email: user?.email 
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
                hideTypingIndicator(); // ✅ Masquer immédiatement si on ne peut pas envoyer
                return;
            }

            // Appel principal au serveur
            fetch(`${BASE_URL}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userMessage, 
                    email: user?.email, 
                    mode: localStorage.getItem("chatMode") || "image" 
                }),
            })
            .then(response => response.json())
            .then(data => {
                console.log("🔍 Réponse reçue du serveur :", data);

                // ✅ Masquer l'indicateur SEULEMENT maintenant
                hideTypingIndicator();

                if (data.levelUpdateMessage && data.levelUpdateType) {
                    showLevelUpdatePopup(data.levelUpdateMessage, data.levelUpdateType);
                }

                if (data.imageUrl) {
                    console.log(`📌 Image reçue : ${data.imageUrl} - Floutée : ${data.isBlurred}`);
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
                hideTypingIndicator(); // ✅ Masquer en cas d'erreur
                addBotMessage('Désolé, une erreur est survenue. Merci de réessayer.', messagesContainer);
            });
        })
        .catch(error => {
            console.error('Erreur lors de la vérification du statut premium:', error);
            hideTypingIndicator(); // ✅ Masquer en cas d'erreur
            addBotMessage('Erreur lors de la vérification du statut premium. Merci de réessayer.', messagesContainer);
        });
    }
}





export function addBotMessage(botReply, messagesContainer) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('bot-message');

    // ✅ Créer un conteneur pour le texte du bot
    const messageContent = document.createElement('span');
    messageContent.innerHTML = botReply;

   // ✅ Ajouter un bouton "Écouter le message vocal"
const voiceButton = document.createElement('button');
voiceButton.classList.add('voice-button');
voiceButton.innerHTML = ''; // Vide le bouton
const icon = document.createElement('i');
const lockIcon = document.createElement('i');
lockIcon.classList.add('fas', 'fa-volume-up'); // Icône audio au lieu du cadenas


icon.classList.add('fas', 'fa-volume-up'); // Ajoute l'icône FA
voiceButton.appendChild(icon);
voiceButton.appendChild(document.createTextNode(' Écouter le message vocal'));

voiceButton.onclick = () => {
    speakMessage(botReply);
};


    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.email) {
        fetch("/api/is-premium", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email }),
        })
        .then(response => response.json())
        .then(({ isPremium }) => {
            if (isPremium) {
                voiceButton.innerHTML = ''; // Vide le bouton
                voiceButton.appendChild(icon); // Réinsère l'icône du son
                voiceButton.appendChild(document.createTextNode(' Écouter le message vocal'));
                voiceButton.onclick = () => speakMessage(botReply);
            } else {
                voiceButton.innerHTML = ''; // Vide le bouton
                voiceButton.innerHTML = ''; // Vide le bouton
voiceButton.appendChild(icon); // Utilise l'icône audio au lieu du cadenas
voiceButton.appendChild(document.createTextNode(' Écouter le message vocal'));

            }
            
            
        })
        .catch(error => console.error("❌ Erreur vérification premium :", error));
    } else {
        voiceButton.innerHTML = ' Écouter le message vocal';
        voiceButton.onclick = () => window.location.href = "premium.html";
    }

    // ✅ Ajouter le texte + le bouton au message
    messageElement.appendChild(messageContent);

const buttonContainer = document.createElement('div');
buttonContainer.classList.add('voice-button-container'); // On ajoute une classe pour mieux le styler
buttonContainer.appendChild(voiceButton);

messagesContainer.appendChild(messageElement);
messagesContainer.appendChild(buttonContainer); // 🔥 On place le bouton en dessous


    // ✅ Ajouter le message au chat
    messagesContainer.appendChild(messageElement);
    scrollToBottom(messagesContainer);
}




export function addBotImageMessage(botReply, imageUrl, isPremium, messagesContainer, isBlurredFromBackend = null) {
    console.log("🖼️ Ajout d'une image au chat...");
    console.log(`📌 Image URL reçue : ${imageUrl}`);
    console.log(`🔎 isBlurred reçu du backend : ${isBlurredFromBackend}`);

    const messageElement = document.createElement('div');
    messageElement.classList.add('bot-message');

    // ✅ Ajouter un conteneur pour le texte du bot
    const messageContent = document.createElement('span');
    messageContent.textContent = botReply;

    // ✅ Ajouter un bouton "Écouter le message vocal"
    const voiceButton = document.createElement('button');
    voiceButton.classList.add('voice-button');

    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.email) {
        fetch("/api/is-premium", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email }),
        })
        .then(response => response.json())
        .then(({ isPremium }) => {
            if (isPremium) {
                voiceButton.innerHTML = ' Écouter le message vocal';
                voiceButton.onclick = () => speakMessage(botReply);
            } else {
                voiceButton.innerHTML = ' Écouter le message vocal';
                voiceButton.onclick = () => window.location.href = "premium.html";
            }
        })
        .catch(error => console.error("❌ Erreur vérification premium :", error));
    } else {
        voiceButton.innerHTML = ' Écouter le message vocal';
        voiceButton.onclick = () => window.location.href = "premium.html";
    }

    // ✅ Ajouter le texte + le bouton dans le message
    messageElement.appendChild(messageContent);

const buttonContainer = document.createElement('div');
buttonContainer.classList.add('voice-button-container'); // On ajoute une classe pour mieux le styler
buttonContainer.appendChild(voiceButton);

messagesContainer.appendChild(messageElement);
messagesContainer.appendChild(buttonContainer); // 🔥 On place le bouton en dessous


    // ✅ Ajouter l'image en dessous du texte
    const imageElement = document.createElement('img');
    imageElement.src = `${BASE_URL}${imageUrl}`;
    imageElement.alt = 'Image générée par l\'IA';
    imageElement.classList.add('chat-image');

    // 🔥 Gestion du flou pour les non-premiums
    let isBlurred = isBlurredFromBackend !== null ? isBlurredFromBackend : imageUrl.includes('/get-image/');
    console.log(`📌 Image est floutée ? ${isBlurred}`);

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

    console.log(`🎭 Changement de personnage en cours : ${characterName}`);

    // ✅ Stocker le personnage côté serveur pour l'utiliser dans le TTS
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.email) {
        fetch("/setCharacter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email, name: characterName })
        })
        .then(response => response.json())
        .then(data => {
            console.log(`✅ Personnage actif mis à jour côté serveur : ${data.message}`);
        })
        .catch(error => console.error("❌ Erreur lors de la mise à jour du personnage :", error));
    } else {
        console.warn("⚠️ Utilisateur non connecté, impossible d'envoyer le personnage.");
    }

    setCharacter(characterName)
    

    .then(() => {
        localStorage.setItem("activeCharacter", characterName);
console.log(`📌 Personnage actif sauvegardé : ${characterName}`);
        console.log(`🎭 Personnage chargé côté serveur : ${characterName}`);

        // ✅ Ajouter l'événement Google Analytics
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
        console.error(`❌ Erreur lors de la mise à jour du personnage côté serveur :`, error);
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


// FONCTION ENVOIE IMAGE USER 

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
                window.location.href = "image-upload.html";
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
            // 🔥 Optimiser l’image avant envoi (compression et redimensionnement)
            const optimizedImage = await optimizeImage(file);

            // Création du FormData pour l’envoi
            const formData = new FormData();
            formData.append("image", optimizedImage, "optimized-image.webp");
            formData.append("email", user.email); // 🔥 Ajout de l'email


            // 🔥 Envoi de l’image optimisée au serveur
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

                // 🔥 🔥 Envoyer un message spécial au serveur pour informer l’IA
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
                
                // ✅ AFFICHER D'ABORD LA POP-UP DE PASSAGE DE NIVEAU AVANT LA RÉPONSE IA
                if (iaData.levelUpdateMessage && iaData.levelUpdateType) {
                    showLevelUpdatePopup(iaData.levelUpdateMessage, iaData.levelUpdateType);
                }
                
                // ✅ Toujours afficher le message de l'IA (texte et/ou image)
                if (iaData.reply) addBotMessage(iaData.reply, messagesContainer);
                if (iaData.imageUrl) addBotImageMessage(iaData.reply, iaData.imageUrl, isPremium, messagesContainer, iaData.isBlurred);
                

                scrollToBottom(messagesContainer);
            } else {
                tempImageElement.innerHTML = `<p>❌ Échec de l’envoi</p>`;
            }
        } catch (error) {
            console.error("❌ Erreur lors de l'envoi de l'image :", error);
        
            // ✅ Vérifier si la réponse contient réellement une erreur
            if (!data || !data.imageUrl) {
                tempImageElement.innerHTML = `<p>❌ Erreur lors de l'envoi</p>`;
            } else {
                tempImageElement.innerHTML = ""; // ✅ Ne rien afficher si tout est OK
            }
        }
        
    });
}

// 🔥 Fonction pour optimiser une image avant envoi (compression + redimensionnement)
function optimizeImage(file, maxWidth = 320, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function (event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function () {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                // Calcul du ratio pour garder les proportions
                const scaleFactor = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scaleFactor;

                // Dessiner l'image compressée
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    (blob) => resolve(blob),
                    "image/webp", // 🔥 Format WebP pour compression maximale
                    quality
                );
            };
        };
        reader.onerror = reject;
    });
}



// Fonction pour lire un message avec une voix française sexy
async function speakMessage(text) {
    const activeCharacterName = localStorage.getItem("activeCharacter");

    if (!activeCharacterName) {
        console.error("❌ Aucun personnage actif trouvé.");
        return;
    }

    const character = characters.find(c => c.name === activeCharacterName);

    if (!character || !character.voice) {
        console.error("❌ Aucune voix définie pour ce personnage.");
        return;
    }

    console.log("📢 Vérification du statut premium...");

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.email) {
        console.error("❌ Utilisateur non connecté !");
        window.location.href = "profile.html";
        return;
    }

    try {
        const response = await fetch("/api/is-premium", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email }),
        });

        const { isPremium } = await response.json();
        
        if (!isPremium) {
            console.warn("🚫 Accès refusé : l'utilisateur n'est pas premium.");
            window.location.href = "premium.html";
            return;
        }

        console.log("✅ L'utilisateur est premium, lecture du message...");

        const ttsResponse = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: text,
                voice_id: character.voice.id,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: character.voice.stability,
                    similarity_boost: character.voice.similarity_boost,
                    speed: character.voice.speed
                }
            })
        });

        if (!ttsResponse.ok) throw new Error("Erreur API TTS Backend");

        const audioBlob = await ttsResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();

        console.log("🔊 Lecture EvenLabs en cours...");
    } catch (error) {
        console.error("❌ Erreur avec l'API TTS :", error);
    }
}

