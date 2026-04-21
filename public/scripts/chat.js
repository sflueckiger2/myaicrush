import { scrollToBottom } from './utils.js';
const _fr = navigator.language?.startsWith("fr");
const _de = navigator.language?.startsWith("de");
import { characters, setCharacter } from './data.js';
import { showLevelUpdatePopup, toggleSignupModal } from './ui.js';
import { openProfileModal } from './profile.js';

const _levelMap = {
  "Level up: you unlock a photo": "Niveau supérieur : tu débloques une photo",
  "Level up: things are getting hotter": "Niveau supérieur : ça devient plus chaud",
  "Level up: intimate photos unlocked": "Niveau supérieur : photos intimes débloquées",
  "She likes you less now": "Elle t'apprécie moins maintenant",
  "She didn't like that": "Elle n'a pas aimé ça",
};
const _levelMapDE = {
  "Level up: you unlock a photo": "Level Up: du schaltest ein Foto frei",
  "Level up: things are getting hotter": "Level Up: es wird heißer",
  "Level up: intimate photos unlocked": "Level Up: intime Fotos freigeschaltet",
  "She likes you less now": "Sie mag dich jetzt weniger",
  "She didn't like that": "Das hat ihr nicht gefallen",
};
function _translateLevel(msg) { return (_fr ? _levelMap[msg] : _de ? _levelMapDE[msg] : null) || msg; }

window.addEventListener("vapi-ready", () => {
  console.log("✅ Vapi prêt !");
  window.vapi = document.querySelector("vapi-widget");
});


async function checkOneClickEligibility(email) {
  try {
    const res = await fetch("/api/check-one-click-eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    return data.eligible === true;
  } catch (err) {
    console.error("❌ Erreur API checkOneClickEligibility:", err);
    return false;
  }
}


// ==== Historique léger (30 derniers messages) ====

const MAX_HISTORY_MESSAGES = 50;

// Per-character conversation history backed by server
const HISTORY_KEY = 'myaicrush_light_history';

function loadConversationHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Erreur loadConversationHistory:', e);
    return [];
  }
}

let conversationHistory = loadConversationHistory();

function saveConversationHistory() {
  try {
    if (conversationHistory.length > MAX_HISTORY_MESSAGES) {
      conversationHistory = conversationHistory.slice(
        conversationHistory.length - MAX_HISTORY_MESSAGES
      );
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(conversationHistory));
  } catch (e) {
    console.error('Erreur saveConversationHistory:', e);
  }
}

function clearConversationHistory() {
  conversationHistory = [];
  localStorage.removeItem(HISTORY_KEY);
}

async function loadServerHistory(characterName) {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.email) return [];
    const res = await fetch('/api/chat-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, character: characterName, limit: 50 })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.messages) ? data.messages : [];
  } catch (e) {
    console.error('Erreur loadServerHistory:', e);
    return [];
  }
}





let firstPhotoSent = false;
const DAILY_MESSAGE_LIMIT = 18;

// ✅ Récupère la date d’aujourd’hui
const today = new Date().toISOString().split('T')[0];
const lastDate = localStorage.getItem("lastMessageDate");

// ✅ Si nouvelle journée, on reset le compteur
if (lastDate !== today) {
    localStorage.setItem("dailyMessageCount", "0");
    localStorage.setItem("lastMessageDate", today);
}

// ✅ Lire le compteur actuel (convertir en nombre)
let dailyMessageCount = parseInt(localStorage.getItem("dailyMessageCount")) || 0;


// Définir dynamiquement l'URL de base
const BASE_URL = window.location.origin;

const toggleMode = document.getElementById("toggleMode");

if (toggleMode) { // ✅ Vérifie que l'élément existe avant de modifier ses propriétés
    const currentMode = localStorage.getItem("chatMode") || "image";
    toggleMode.checked = currentMode === "gif";

   
    toggleMode.addEventListener("change", async () => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user || !user.email) {
        alert(_fr ? "Tu dois être connecté pour activer ce mode." : _de ? "Du musst angemeldet sein." : "You must be logged in to enable this mode.");
        toggleMode.checked = false;
        return;
    }

    try {
        const premiumCheck = await fetch(`${BASE_URL}/api/is-premium`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email }),
        });

        const { isPremium } = await premiumCheck.json();

        if (!isPremium) {
            alert(_fr ? "🎥 Réservé aux membres Premium." : _de ? "🎥 Nur für Premium-Mitglieder." : "🎥 Premium members only.");
            toggleMode.checked = false;
            window.location.href = "/premium.html";
            return;
        }

        // ✅ Si Premium, autorise le changement de mode
        const newMode = toggleMode.checked ? "gif" : "image";
        localStorage.setItem("chatMode", newMode);
        console.log(`🎬 Mode changé : ${newMode}`);
    } catch (error) {
        console.error("Erreur lors de la vérification du statut premium :", error);
        toggleMode.checked = false;
        alert(_fr ? "Erreur lors de la vérification du compte. Merci de réessayer." : _de ? "Fehler bei der Kontoverifizierung. Bitte erneut versuchen." : "Error checking your account. Please try again.");
    }
});


} else {
    console.warn("⚠️ 'toggleMode' non trouvé sur cette page.");
}

// MODE NYMPHO
const nymphoToggle = document.getElementById("nymphoModeToggle");

if (nymphoToggle) {
  // Toujours désactiver au chargement
  localStorage.setItem("nymphoMode", "false");
  nymphoToggle.checked = false;

  nymphoToggle.addEventListener("change", async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const activeCharacter = localStorage.getItem("activeCharacter");

    if (!user || !user.email || !activeCharacter) {
      alert("Tu dois être connecté pour activer ce mode.");
      nymphoToggle.checked = false;
      return;
    }

    // Vérifie si l'utilisateur est premium
    const premiumCheck = await fetch(`${BASE_URL}/api/is-premium`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });

    const { isPremium } = await premiumCheck.json();

    if (!isPremium) {
      alert(_fr ? "Réservé aux membres Premium 😈" : _de ? "Nur für Premium-Mitglieder 😈" : "Premium members only 😈");
      window.location.href = "/premium.html";
      nymphoToggle.checked = false;
      return;
    }

    // Vérifie si le mode est déjà activé pour ce personnage
    const statusCheck = await fetch(`${BASE_URL}/api/check-nympho-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, character: activeCharacter }),
    });

    const { alreadyUnlocked } = await statusCheck.json();

    if (nymphoToggle.checked) {
      if (!alreadyUnlocked) {
        const confirmation = confirm(_fr ? "Activer le mode Nymphomane sur cette I.A coûte 25 jetons. Es-tu sûr ? (valable 1h)" : _de ? "Den Nympho-Modus aktivieren kostet 25 Token. Bist du sicher? (1 Stunde gültig)" : "Activating Nympho mode costs 25 tokens. Are you sure? (valid for 1 hour)");
        if (!confirmation) {
          nymphoToggle.checked = false;
          return;
        }
      }

      // Activation côté serveur
      try {
        const response = await fetch(`${BASE_URL}/api/activate-nympho-mode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          localStorage.setItem("nymphoMode", "true");
                } else if (data?.showJetonsPopup) {
          const eligible = await checkOneClickEligibility(user.email);
          if (eligible) {
            openJetonsPopup(); // ✅ Affiche la popup d’achat
          } else {
            window.location.href = "/jetons.html"; // ❌ Redirige si pas éligible
          }

        } else if (data?.redirect) {
          window.location.href = data.redirect;
        } else {
          alert("❌ Erreur : " + data.message);
        }

        if (!data.success) nymphoToggle.checked = false;

      } catch (err) {
        console.error("❌ Erreur API nympho :", err);
        alert(_fr ? "Erreur lors de l'activation." : _de ? "Fehler bei der Aktivierung." : "Error during activation.");
        nymphoToggle.checked = false;
      }
    } else {
      // Désactivation manuelle
      localStorage.setItem("nymphoMode", "false");
    }
  });
  
} else {
  console.warn("⚠️ Toggle 'nymphoModeToggle' non trouvé.");
}


function openJetonsPopup() {
  const popup = document.getElementById("jetons-popup");
  if (popup) {
    popup.classList.remove("hidden");
  } else {
    console.warn("❌ Popup jetons non trouvée !");
    window.location.href = "/jetons.html"; // 🔁 fallback de secours
  }
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

        // Affichage du message utilisateur
        const messageElement = document.createElement('div');
        messageElement.textContent = userMessage;
        messageElement.classList.add('user-message');
        messagesContainer.appendChild(messageElement);

        if (typeof scrollToBottomCallback === 'function') {
            scrollToBottomCallback(messagesContainer);
        }

                    // 🧠 Sauvegarde du message utilisateur dans l'historique léger
        conversationHistory.push({
            role: "user",
            type: "text",
            content: userMessage
        });
        saveConversationHistory();



        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.email) {
            console.error('Utilisateur non connecté ou email manquant');
            return;
        }

        // Afficher l'indicateur de saisie
        showTypingIndicator(messagesContainer);

        console.log("📨 Envoi du message avec :", {
            message: userMessage,
            email: user?.email
        });

        // Vérifier statut premium
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

            // Limite messages non-premium
            if (!isPremium && dailyMessageCount >= DAILY_MESSAGE_LIMIT) {
                addBotMessage(
                    _fr
                      ? `Tu as atteint ta limite de messages gratuits.
                         <a href="premium.html" style="color: #dd4d9d; text-decoration: underline;">
                         Passe Premium</a> pour des messages illimités.`
                      : _de
                      ? `Du hast dein kostenloses Nachrichtenlimit erreicht.
                         <a href="premium.html" style="color: #dd4d9d; text-decoration: underline;">
                         Werde Premium</a> für unbegrenzte Nachrichten.`
                      : `You've reached your free message limit.
                         <a href="premium.html" style="color: #dd4d9d; text-decoration: underline;">
                         Become Premium</a> to unlock unlimited messages.`,
                    messagesContainer
                );
                hideTypingIndicator();
                return;
            }


// Appel principal au backend IA
fetch(`${BASE_URL}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        message: userMessage,
        email: user?.email,
        mode: localStorage.getItem("chatMode") || "image",
        nymphoMode: localStorage.getItem("nymphoMode") === "true",
        history: conversationHistory   // 🧠 On envoie les 30 derniers messages
    }),

})
.then(async (res) => {
    if (!res.ok) {
        const txt = await res.text();
        console.error("❌ Réponse non OK du serveur /message :", res.status, txt);
        hideTypingIndicator();
        addBotMessage(
          _fr ? "Petit bug serveur, réessaie dans quelques secondes 😅" : _de ? "Kleiner Serverfehler, versuche es in ein paar Sekunden erneut 😅" : "Small server issue, try again in a few seconds 😅",
          messagesContainer
        );
        throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
})
.then(data => {
    console.log("🔍 Réponse reçue du serveur :", data);

    hideTypingIndicator();

    // Mise à jour de niveau (popup)
    if (data.levelUpdateMessage && data.levelUpdateType) {
        const msg = (_fr || _de) ? _translateLevel(data.levelUpdateMessage) : data.levelUpdateMessage;
        showLevelUpdatePopup(msg, data.levelUpdateType);
    }

    // Message texte ou image
    if (data.replies && data.replies.length > 1) {
        addBotBubbles(data.replies, messagesContainer, data.imageUrl ? {
            url: data.imageUrl,
            isPremium,
            isBlurred: data.isBlurred,
            mediaType: data.mediaType
        } : null);
    } else if (data.imageUrl) {
        addBotImageMessage(
            data.reply,
            data.imageUrl,
            isPremium,
            messagesContainer,
            data.isBlurred,
            data.mediaType
        );
    } else {
        addBotMessage(data.reply, messagesContainer);
    }

    // 🧠 Sauvegarde de la réponse IA (texte) dans l'historique léger
    if (data.reply) {
        conversationHistory.push({
            role: "assistant",
            type: "text",
            content: data.reply
        });
        saveConversationHistory();
    }



    // 🔥 On ne s'occupe plus des quickReplies ici (elles arrivent dans un second temps)

    // Incrémentation messages non premium
    if (!isPremium) {
        dailyMessageCount++;
        localStorage.setItem("dailyMessageCount", dailyMessageCount);
    }

    if (typeof scrollToBottomCallback === 'function') {
        scrollToBottomCallback(messagesContainer);
    }

    // 🆕 2ème étape : demander les quick replies en BACKGROUND
    const activeCharacter = localStorage.getItem("activeCharacter");
    if (activeCharacter) {
        fetch(`${BASE_URL}/quick-replies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: user.email,
                characterName: activeCharacter,
                lastUserMessage: userMessage,
                botReply: data.reply,
                nymphoMode: localStorage.getItem("nymphoMode") === "true"
            }),
        })
        .then(r => r.json())
        .then(qrData => {
            console.log("👉 Réponses suggérées (quickReplies) :", qrData.quickReplies);
            if (typeof renderQuickReplies === 'function' && typeof hideQuickReplies === 'function') {
                if (Array.isArray(qrData.quickReplies) && qrData.quickReplies.length > 0) {
                    renderQuickReplies(qrData.quickReplies);
                } else {
                    hideQuickReplies();
                }
            }
        })
        .catch(err => {
            console.error("❌ Erreur quick-replies :", err);
            if (typeof hideQuickReplies === 'function') hideQuickReplies();
        });
    }

})
.catch(error => {
    console.error("❌ Erreur lors de l'envoi du message:", error);
    hideTypingIndicator();
    addBotMessage(_fr ? 'Désolé, une erreur est survenue. Merci de réessayer.' : _de ? 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.' : 'Sorry, an error occurred. Please try again.', messagesContainer);
});



        })
        .catch(error => {
            console.error('❌ Erreur lors de la vérification premium :', error);
            hideTypingIndicator();
            addBotMessage(_fr ? 'Erreur lors de la vérification du statut premium. Merci de réessayer.' : _de ? 'Fehler bei der Überprüfung des Premium-Status. Bitte versuche es erneut.' : 'Error checking premium status. Please try again.', messagesContainer);
        });
    }
}





export function addBotMessage(botReply, messagesContainer, isWarning = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('bot-message');

    if (isWarning) {
        messageElement.classList.add('warning');
    }

    const messageContent = document.createElement('span');
    messageContent.innerHTML = botReply;
    messageElement.appendChild(messageContent);

    if (!isWarning) {
        const voiceButton = document.createElement('button');
        voiceButton.classList.add('voice-button');
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceButton.onclick = function() { speakMessage(botReply, this); };
        messageElement.appendChild(voiceButton);
    }

    messagesContainer.appendChild(messageElement);

    scrollToBottom(messagesContainer);
}

export function addBotBubbles(bubbles, messagesContainer, imageData) {
    let delay = 0;
    bubbles.forEach((bubble, i) => {
        const typingTime = Math.min(Math.max(bubble.length * 35, 400), 1800);
        delay += (i === 0) ? 0 : typingTime;

        setTimeout(() => {
            if (i > 0) showTypingIndicator(messagesContainer);
            const typeDelay = (i === 0) ? 0 : Math.min(Math.max(bubble.length * 30, 300), 1200);

            setTimeout(() => {
                if (i > 0) hideTypingIndicator();
                addBotMessage(bubble, messagesContainer);
                if (imageData && i === bubbles.length - 1) {
                    addBotImageMessage('', imageData.url, imageData.isPremium, messagesContainer, imageData.isBlurred, imageData.mediaType);
                }
            }, typeDelay);
        }, delay);

        delay += (i === 0) ? 0 : Math.min(Math.max(bubble.length * 30, 300), 1200);
    });
}





export function addBotImageMessage(botReply, imageUrl, isPremium, messagesContainer, isBlurredFromBackend = null, mediaType = 'image') {

    console.log("🖼️ Ajout d'une image au chat...");
    console.log(`📌 Image URL reçue : ${imageUrl}`);
    console.log(`🔎 isBlurred reçu du backend : ${isBlurredFromBackend}`);

    const messageElement = document.createElement('div');
    messageElement.classList.add('bot-message');

    // ✅ Ajouter un conteneur pour le texte du bot
    const messageContent = document.createElement('span');
    messageContent.textContent = botReply;

    // Bouton audio style WhatsApp
    const voiceButton = document.createElement('button');
    voiceButton.classList.add('voice-button');
    voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceButton.onclick = function() { speakMessage(botReply, this); };

    messageElement.appendChild(messageContent);

    if (botReply && botReply.trim()) {
        messageElement.appendChild(voiceButton);
    }

    messagesContainer.appendChild(messageElement);



    // ✅ Ajouter l'image en dessous du texte
    
    let mediaElement;
const isVideo = mediaType === 'video';


if (isVideo) {
    mediaElement = document.createElement('video');

    const isAbsoluteUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
    const finalUrl = isAbsoluteUrl ? imageUrl : `/get-image/${imageUrl.split('/').pop()}.mp4`;


    mediaElement.src = finalUrl;
    mediaElement.autoplay = true;
    mediaElement.loop = true;
    mediaElement.muted = true;
    mediaElement.playsInline = true;
    mediaElement.classList.add('chat-video');

    mediaElement.style.maxWidth = '100%';
    mediaElement.style.height = 'auto';
    mediaElement.style.display = 'block';

    setTimeout(() => {
      const playPromise = mediaElement.play?.();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(() => {
          console.log("🎬 Lecture forcée réussie sur iOS");
        }).catch(err => {
          console.warn("⛔ Lecture bloquée sur iOS :", err);
        });
      }
    }, 100);
}

 else {
    mediaElement = document.createElement('img');
    mediaElement.src = imageUrl.startsWith('/get-image/')
      ? imageUrl
      : `/get-image/${imageUrl.split('/').pop()}`;
    mediaElement.alt = 'Image générée par l\'IA';
    mediaElement.classList.add('chat-image');
}


    // 🔥 Gestion du flou pour les non-premiums
    let isBlurred = isBlurredFromBackend !== null ? isBlurredFromBackend : imageUrl.includes('/get-image/');
    console.log(`📌 Image est floutée ? ${isBlurred}`);

    if (!isPremium && isBlurred) {
        console.log("💨 Image détectée comme floutée, ajout du bouton Unlock.");
        
        const imageContainer = document.createElement('div');
        imageContainer.classList.add('image-container');

        const unlockButton = document.createElement('button');
        unlockButton.textContent = _fr ? 'Débloquer' : _de ? 'Freischalten' : 'Unlock';
        unlockButton.classList.add('unlock-button');
        unlockButton.onclick = () => {
            window.location.href = '/premium.html';
        };

        imageContainer.appendChild(mediaElement);
        imageContainer.appendChild(unlockButton);
        messageElement.appendChild(imageContainer);
        } else {
        console.log("🌟 Image claire affichée, pas de bouton.");
        if (isVideo) {
            const rawVideoHTML = `
                <video 
                    src="${imageUrl.startsWith('http') ? imageUrl : `/get-image/${imageUrl.split('/').pop()}`}" 
                    autoplay 
                    loop 
                    muted 
                    playsinline 
                    class="chat-video" 
                    style="max-width: 100%; height: auto; display: block;">
                </video>
            `;

            const wrapper = document.createElement('div');
            wrapper.innerHTML = rawVideoHTML.trim();
            const injectedVideo = wrapper.firstChild;

            setTimeout(() => {
                const playPromise = injectedVideo.play?.();
                if (playPromise && typeof playPromise.then === 'function') {
                    playPromise.then(() => {
                        console.log("🎬 Lecture forcée réussie (injected)");
                    }).catch(err => {
                        console.warn("⛔ Lecture bloquée même injectée :", err);
                    });
                }
            }, 100);

            messageElement.appendChild(injectedVideo);

            // 🧠 Sauvegarde du média IA (vidéo) dans l'historique léger
            conversationHistory.push({
                role: "assistant",
                type: "video",
                imageUrl: injectedVideo.src
            });
        } else {
            messageElement.appendChild(mediaElement);

            // 🧠 Sauvegarde du média IA (image) dans l'historique léger
            conversationHistory.push({
                role: "assistant",
                type: "image",
                imageUrl: mediaElement.src
            });
        }

        saveConversationHistory();
    }

    scrollToBottom(messagesContainer);
}









// Exemple d'utilisation : Ajouter après l'envoi d'un message utilisateur
const sendBtn = document.getElementById('send-btn');
const userInput = document.getElementById('user-input');


// ==============================
// 🎤 VOICE-TO-TEXT (FULL LOW COST) — Web Speech API
// ==============================

function initVoiceToText() {
  // ✅ Guard: empêche double init (très fréquent en prod)
  if (window.__myaicrush_vtt_initialized) return;
  window.__myaicrush_vtt_initialized = true;

  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const messagesContainer = document.getElementById('messages');

  if (!userInput || !sendBtn || !messagesContainer) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("🎤 SpeechRecognition non supporté sur ce navigateur.");
    return;
  }

  const MIC_SVG = `
    <svg class="mic-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a1 1 0 1 0-2 0a3 3 0 0 1-6 0a1 1 0 1 0-2 0a5 5 0 0 0 4 4.9V18H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.1a5 5 0 0 0 4-4.9Z"/>
    </svg>`;

  const STOP_SVG = `
    <svg class="mic-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M8 8h8v8H8z"/>
    </svg>`;

  // Crée le bouton micro si pas déjà présent
  let micBtn = document.getElementById('mic-btn');
  if (!micBtn) {
    micBtn = document.createElement('button');
    micBtn.id = 'mic-btn';
    micBtn.type = 'button';
    micBtn.className = 'mic-btn';
    micBtn.setAttribute('aria-label', 'Voice message');
    micBtn.innerHTML = MIC_SVG;

    sendBtn.parentNode.insertBefore(micBtn, sendBtn);
  }

  let recognition = null;
  let isRecording = false;

  function setMicUI(recording) {
    micBtn.classList.toggle('recording', recording);
    micBtn.innerHTML = recording ? STOP_SVG : MIC_SVG;
  }

  function buildTranscriptFromResults(results) {
    // ✅ Dédup robuste : certains moteurs répètent EXACTEMENT la même phrase finale
    const finals = [];
    const finalsSeen = new Set();
    let interim = "";

    for (let i = 0; i < results.length; i++) {
      const txt = (results[i][0]?.transcript || "").trim();
      if (!txt) continue;

      if (results[i].isFinal) {
        const key = txt.toLowerCase();
        if (!finalsSeen.has(key)) {
          finalsSeen.add(key);
          finals.push(txt);
        }
      } else {
        interim += txt + " ";
      }
    }

    const finalText = finals.join(" ").trim();
    const interimText = interim.trim();

    return (finalText + " " + interimText).replace(/\s+/g, " ").trim();
  }

  function startRecording() {
    if (isRecording) return;

    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;
    recognition.continuous = false; // ✅ meilleur sur mobile pour éviter répétitions

    recognition.onstart = () => {
      isRecording = true;
      setMicUI(true);
    };

    recognition.onerror = (e) => {
      console.warn("🎤 SpeechRecognition error:", e);

      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        alert("Autorise le micro dans ton navigateur pour envoyer un message vocal 🎤");
      } else {
        alert("Le message vocal ne fonctionne pas sur ce navigateur (ou permission refusée).");
      }

      stopRecording(true);
    };

    recognition.onresult = (event) => {
      const liveText = buildTranscriptFromResults(event.results);
      userInput.value = liveText;
    };

    recognition.onend = () => {
      isRecording = false;
      setMicUI(false);
    };

    recognition.start();
  }

  function stopRecording(force = false) {
    if (!recognition) return;

    try { recognition.stop(); } catch (e) {}

    isRecording = false;
    setMicUI(false);

    if (!force) {
      const text = (userInput.value || "").trim();
      if (text.length > 0) {
        addUserMessage(text, messagesContainer, scrollToBottom);
        userInput.value = '';
      }
    }

    recognition = null;
  }

  micBtn.addEventListener('click', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.email) {
      window.location.href = 'profile.html';
      return;
    }

    if (!isRecording) startRecording();
    else stopRecording(false);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isRecording) stopRecording(true);
  });
}

// ✅ Init dès que possible
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initVoiceToText);
} else {
  initVoiceToText();
}





if (sendBtn && userInput) {
  const messagesContainer = document.getElementById('messages');

  sendBtn.addEventListener('click', () => {
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  addUserMessage(userMessage, messagesContainer, scrollToBottom);

  userInput.value = '';
  userInput.dispatchEvent(new Event("input")); // ✅ force autoGrow + updateInputHeightVar
});

}



// --- Gestion clavier robuste via variables CSS (fonctionne IG, iOS, Android) ---

// 1) Fallback --vh pour vieux webviews
function setVHVar() {
  const h = window.innerHeight || document.documentElement.clientHeight;
  document.documentElement.style.setProperty('--vh', `${h * 0.01}px`);
}
setVHVar();
window.addEventListener('resize', setVHVar);

// 2) Met à jour la hauteur de la barre d’input (--input-h)
function updateInputHeightVar() {
  const input = document.getElementById('input-area');
  if (!input) return;
  const h = input.offsetHeight || 64;
  document.documentElement.style.setProperty('--input-h', `${h}px`);
}
window.addEventListener('load', updateInputHeightVar);
window.addEventListener('resize', updateInputHeightVar);

// 3) Calcule et applique la hauteur du clavier (--kb) avec visualViewport si dispo
const vv = window.visualViewport;

function applyKeyboardInsets() {
  const msgs  = document.getElementById('messages');
  const input = document.getElementById('input-area');
  if (!input) return;

  // hauteur estimée du clavier
  let kb = 0;
  if (vv) {
    kb = window.innerHeight - vv.height - vv.offsetTop;
    if (kb < 0) kb = 0;
    // ignore les micro variations (scroll/zoom)
    if (kb < 30) kb = 0;
  }
  // Expose au CSS
  document.documentElement.style.setProperty('--kb', `${kb}px`);

  // s'assure que le bas reste visible
  if (msgs) {
    msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'instant' });
  }
}

if (vv) {
  vv.addEventListener('resize', applyKeyboardInsets);
  vv.addEventListener('scroll', applyKeyboardInsets);
}
window.addEventListener('orientationchange', () => {
  setTimeout(() => { setVHVar(); updateInputHeightVar(); applyKeyboardInsets(); }, 120);
});
window.addEventListener('focusin', (e) => {
  if (e.target && e.target.id === 'user-input') {
    setTimeout(() => {
      applyKeyboardInsets();
      e.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const msgs = document.getElementById('messages');
      if (msgs) msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' });
    }, 50);
  }
});
window.addEventListener('focusout', applyKeyboardInsets);



// --- Fallback "forcé" Instagram Android (clavier overlay non mesurable) ---
(function instagramAndroidHardFallback(){
  const isIG = /Instagram/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (!isIG || !isAndroid) return;

  const vv = window.visualViewport;

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  // Donne une estimation réaliste de la hauteur clavier en px CSS
  function guessKeyboardPx() {
    // 40-45% de la hauteur visible, bornée
    const h = window.innerHeight || document.documentElement.clientHeight || 700;
    return Math.round(clamp(h * 0.44, 220, 380));
  }

  function setKB(px){
    document.documentElement.style.setProperty('--kb', (px|0) + 'px');
    const msgs = document.getElementById('messages');
    if (msgs) msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'instant' });
  }

  // Quand l’input prend le focus : si on ne détecte pas de clavier via VV, on force une valeur
  window.addEventListener('focusin', (e) => {
    if (e.target && e.target.id === 'user-input') {
      let kb = 0;
      if (vv) {
        kb = window.innerHeight - vv.height - vv.offsetTop;
      }
      if (kb < 30) {
        // Pas de mesure fiable -> valeur forcée
        setKB(guessKeyboardPx());
      } else {
        setKB(kb);
      }
    }
  });

  // Quand on tape ou qu’un resize survient, si VV finit par bouger on reprend la vraie valeur
  function maybeRefine() {
    if (!vv) return;
    const kb = window.innerHeight - vv.height - vv.offsetTop;
    if (kb >= 30) setKB(kb);
  }
  if (vv) {
    vv.addEventListener('resize', maybeRefine);
    vv.addEventListener('scroll', maybeRefine);
  }
  window.addEventListener('resize', maybeRefine);

  // Fermeture du clavier
  window.addEventListener('focusout', () => setKB(0));

  // Rotation : on recalculera une nouvelle estimation
  window.addEventListener('orientationchange', () => {
    setTimeout(() => { setKB(0); setKB(guessKeyboardPx()); }, 150);
  });
})();





 
  export async function startChat(characterName) {
    if (!isUserLoggedIn()) {
        window.location.href = 'profile.html';
        return;
    }

    // Load conversation history from server for this character
    const previousCharacter = localStorage.getItem("activeCharacter");
    clearConversationHistory();
    const serverHistory = await loadServerHistory(characterName);
    if (serverHistory.length > 0) {
      conversationHistory = serverHistory.map(m => ({
        role: m.role, type: m.type || "text", content: m.content || "", imageUrl: m.imageUrl || null
      }));
      saveConversationHistory();
      console.log(`📂 Loaded ${serverHistory.length} messages from server for ${characterName}`);
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

        trackCharacterSelection(characterName);
const messagesContainer = document.getElementById('messages');
if (messagesContainer) {
    messagesContainer.innerHTML = ''; // Réinitialiser les messages au début

    // 🔍 Trouver le personnage dans le JSON
    const character = characters.find(c => c.name === characterName);



// 🔄 Mise à jour dynamique de l'agent-id du widget ElevenLabs
const widget = document.querySelector('elevenlabs-convai');
if (widget) {
    if (character.agent?.id) {
        widget.setAttribute('agent-id', character.agent.id);
        console.log("🎙️ Agent ElevenLabs défini :", character.agent.id);
    } else {
        widget.removeAttribute('agent-id');
        console.warn("⚠️ Aucun agent-id défini pour ce personnage.");
    }
}

            
            // ✅ Gérer l'affichage du toggle "Mode Nymphomane"
const nymphoToggleWrapper = document.getElementById("nympho-mode-toggle-wrapper"); // 👉 le conteneur du bouton
if (nymphoToggleWrapper) {
    if (character.hasNymphoMode) {
        nymphoToggleWrapper.style.display = "inline-flex"; // ou "block" selon ton style
        console.log("🔥 Le personnage a un mode nympho, toggle affiché.");
    } else {
        nymphoToggleWrapper.style.display = "none";
        console.log("🚫 Pas de mode nympho, toggle masqué.");
    }
}

// 🎧 Afficher ou cacher l'icône téléphone selon le personnage
const callButton = document.getElementById("audio-call-btn");
if (callButton) {
  if (character.hasAudioCall === true) {
    callButton.style.display = "inline-block"; // ou "flex" selon ton style
    console.log("📞 Icône téléphone affichée");
  } else {
    callButton.style.display = "none";
    console.log("📵 Ce personnage ne permet pas les appels audio");
  }
}


           if (character) {
    if (character.introVideo) {
        // 🔥 Ajouter la vidéo d’intro si disponible
        const videoElement = document.createElement('video');
        videoElement.src = character.introVideo;
        videoElement.autoplay = true;
        videoElement.loop = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.classList.add('chat-video');
        videoElement.style.maxWidth = '100%';
        videoElement.style.height = 'auto';
        videoElement.style.display = 'block';

        const wrapper = document.createElement('div');
        wrapper.classList.add('bot-message');
        wrapper.appendChild(videoElement);
        messagesContainer.appendChild(wrapper);
        scrollToBottom(messagesContainer);
    } else {
        // 🔥 Message texte par défaut si pas de vidéo
        addBotMessage(
            "🌸 Nos I.A sont délicates. Parle-leur avec douceur, comme si c'étaient de vraies personnes. Tu seras récompensé... <3",
            messagesContainer,
            true
        );
    }

    // 🎬 Toujours afficher la mise en situation personnalisée
    if (character.ethnicity) {
        addBotMessage(
            `🎬 Situation : ${character.ethnicity.replace(/\n/g, '<br>')}`,
            messagesContainer,
            true
        );
    }

       // 🧠 Rejouer l'historique sous la vidéo + le texte d'intro
    if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.forEach((msg) => {
            const messageElement = document.createElement('div');

            if (msg.role === "user") {
                messageElement.classList.add('user-message');
            } else {
                messageElement.classList.add('bot-message');
            }

            // Texte simple
            if (!msg.type || msg.type === "text") {
                messageElement.textContent = msg.content || "";
                messagesContainer.appendChild(messageElement);
                return;
            }

            // Image / vidéo
            if ((msg.type === "image" || msg.type === "video") && msg.imageUrl) {
                let mediaEl;

                if (msg.type === "video") {
                    mediaEl = document.createElement('video');
                    mediaEl.src = msg.imageUrl;
                    mediaEl.autoplay = true;
                    mediaEl.loop = true;
                    mediaEl.muted = true;
                    mediaEl.playsInline = true;
                    mediaEl.classList.add('chat-video');
                } else {
                    mediaEl = document.createElement('img');
                    mediaEl.src = msg.imageUrl;
                    mediaEl.alt = "Image du chat";
                    mediaEl.classList.add('chat-image');
                }

                messageElement.appendChild(mediaEl);
                messagesContainer.appendChild(messageElement);
                return;
            }

            // Fallback : si on ne reconnaît pas le type, on n'affiche rien de spécial
            messagesContainer.appendChild(messageElement);
        });

        scrollToBottom(messagesContainer);
    }





   


                // ✅ Gestion de l'affichage du chat
                document.querySelector('.chat-options').style.display = 'none';
                document.getElementById('chat-box').style.display = 'flex';

                
                document.querySelector('.container').classList.add('fullscreen');

                // 🔒 Cacher la barre de stories quand le chat est ouvert
const storiesWrapper = document.querySelector('.stories-wrapper');
if (storiesWrapper) {
  storiesWrapper.style.display = 'none';
}


                // ✅ Mise à jour du nom et de la photo de profil
                document.getElementById('chat-name').textContent = character.name;

                // 🔥 Gérer le mode nympho pour la photo
// 🔥 Gérer le mode nympho pour la photo de profil
const isNympho = localStorage.getItem("nymphoMode") === "true";
if (isNympho && character.images?.nympho) {
    // 👉 on prend la preview définie dans le JSON, sans forcer l'extension
    character.photo = character.images.nymphoPreview || character.photo;
    console.log("🌶️ Mode nymphomane actif : photo modifiée !");
}


const oldMedia = document.querySelector('.chat-profile-pic');
const profileContainer = oldMedia ? oldMedia.parentNode : document.querySelector('.profile-pic-container');

if (oldMedia) oldMedia.remove();
if (!profileContainer) {
  console.warn("❌ Conteneur photo de profil introuvable");
  return;
}


let newMedia;
if (character.photo.endsWith('.mp4')) {
    newMedia = document.createElement('video');
    newMedia.src = character.photo;
    newMedia.autoplay = true;
    newMedia.loop = true;
    newMedia.muted = true;
    newMedia.playsInline = true;
} else {
    newMedia = document.createElement('img');
    newMedia.src = character.photo;
}

newMedia.classList.add('chat-profile-pic');
newMedia.style.cursor = 'pointer';
if (callButton) {
  profileContainer.insertBefore(newMedia, callButton);
} else {
  profileContainer.appendChild(newMedia);
}
;

// Réactiver le clic pour ouvrir la modale de profil
newMedia.addEventListener("click", () => openProfileModal(character.name));


// 🔥 Mise à jour dynamique de l'image de fond du chat uniquement sur mobile
const chatBox = document.getElementById("chat-box");
if (chatBox) {
    if (window.innerWidth < 768) {  // ✅ Seulement si écran < 768px (mobile/tablette)
        const bgImage = character.backgroundPhoto || character.photo;

chatBox.style.backgroundImage = `url('${bgImage}')`;
chatBox.style.backgroundSize = 'cover';
chatBox.style.backgroundPosition = 'center';
chatBox.style.backgroundRepeat = 'no-repeat';
chatBox.style.backdropFilter = 'blur(12px)';
chatBox.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
chatBox.style.backgroundBlendMode = 'darken';

        chatBox.style.backgroundSize = 'cover';
        chatBox.style.backgroundPosition = 'center';
        chatBox.style.backgroundRepeat = 'no-repeat';
        chatBox.style.backdropFilter = 'blur(12px)';
        chatBox.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        chatBox.style.backgroundBlendMode = 'darken';
    } else {
        // ✅ Si desktop, on remet le fond d’origine (gris)
        chatBox.style.backgroundImage = '';
        chatBox.style.backgroundColor = 'linear-gradient(to bottom, #1e1e2f, #2e2e44)';
        chatBox.style.backdropFilter = '';
        chatBox.style.backgroundBlendMode = '';
    }
}


                document.querySelector('.menu').classList.add('hidden');

                // ✅ FORCER LE MODE IMAGE PAR DÉFAUT À CHAQUE CHANGEMENT DE PERSONNAGE
                const toggleMode = document.getElementById("toggleMode");
                const modeToggleContainer = document.getElementById("mode-toggle-container");
                const videoTag = document.getElementById("video-available");

                if (toggleMode && modeToggleContainer) {
                    localStorage.setItem("chatMode", "image");
                    toggleMode.checked = false; // Mode image par défaut

                    // ✅ AFFICHER OU CACHER LE TOGGLE VIDÉO
                    if (character.hasVideos) {
                        modeToggleContainer.style.display = "block";
                        console.log("🎬 Le personnage a des vidéos, affichage du toggle.");
                    } else {
                        modeToggleContainer.style.display = "none";
                        console.log("📸 Aucun GIF disponible, on cache le toggle.");
                    }
                }

                // ✅ AFFICHER OU CACHER L'ENCART VIDÉO
                if (videoTag) {
                    if (character.hasVideos) {
                        videoTag.style.display = "block";
                        console.log("📢 Vidéos disponibles, affichage de l'encart.");
                    } else {
                        videoTag.style.display = "none";
                        console.log("🚫 Aucune vidéo disponible, encart caché.");
                    }
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
    hideTypingIndicator();
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typing-indicator';
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        typingIndicator.appendChild(dot);
    }
    messagesContainer.appendChild(typingIndicator);
    scrollToBottom(messagesContainer);
}


function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
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
            // 🔥 Vérifier si l'utilisateur est Premium
            const premiumResponse = await fetch(`${BASE_URL}/api/is-premium`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user.email }),
            });

            const { isPremium } = await premiumResponse.json();
            if (!isPremium) {
                window.location.href = "premium.html"; // 🔥 Redirection vers une autre page si non-premium
                return;
            }

            // ✅ L'utilisateur est Premium, on vérifie maintenant son quota d'images
            const quotaResponse = await fetch(`${BASE_URL}/api/check-upload-limit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user.email }),
            });

            const { canUpload, redirect } = await quotaResponse.json();

            if (!canUpload) {
                console.warn(`🚨 Limite d'upload atteinte ! Redirection vers ${redirect}`);
                window.location.href = redirect; // 🔥 Redirection immédiate vers achat de jetons
                return;
            }

            // ✅ Si tout est OK, ouvrir l'explorateur de fichiers pour sélectionner une image
            const imageInput = document.getElementById("image-input");
           
        } catch (error) {
            console.error("❌ Erreur lors de la vérification du statut premium et du quota d'images :", error);
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
        tempImageElement.innerHTML = `<p>📤 ${_fr ? "Envoi en cours..." : _de ? "Senden..." : "Uploading..."}</p>`;
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

                               // 🧠 Sauvegarde de l'image envoyée par l'utilisateur dans l'historique léger
                conversationHistory.push({
                    role: "user",
                    type: "image",
                    imageUrl: imageElement.src
                });
                saveConversationHistory();
 

                imageInput.value = "";

                showTypingIndicator(messagesContainer);

                // Envoyer un message spécial au serveur pour informer l’IA
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

                hideTypingIndicator();
                
                // ✅ AFFICHER D'ABORD LA POP-UP DE PASSAGE DE NIVEAU AVANT LA RÉPONSE IA
                if (iaData.levelUpdateMessage && iaData.levelUpdateType) {
                    const msg = (_fr || _de) ? _translateLevel(iaData.levelUpdateMessage) : iaData.levelUpdateMessage;
                    showLevelUpdatePopup(msg, iaData.levelUpdateType);
                }
                
                // ✅ Toujours afficher le message de l'IA (texte et/ou image)
                if (iaData.replies && iaData.replies.length > 1) {
                    addBotBubbles(iaData.replies, messagesContainer);
                } else if (iaData.reply) {
                    addBotMessage(iaData.reply, messagesContainer);
                }
                if (iaData.imageUrl) addBotImageMessage(iaData.reply, iaData.imageUrl, isPremium, messagesContainer, iaData.isBlurred);
                

                scrollToBottom(messagesContainer);
            } else {
                tempImageElement.innerHTML = `<p>❌ ${_fr ? "Échec de l'envoi" : _de ? "Senden fehlgeschlagen" : "Upload failed"}</p>`;
            }
        } catch (error) {
            console.error("❌ Erreur lors de l'envoi de l'image :", error);
            hideTypingIndicator();
        
            // ✅ Vérifier si la réponse contient réellement une erreur
            if (!data || !data.imageUrl) {
                tempImageElement.innerHTML = `<p>❌ ${_fr ? "Erreur lors de l'envoi" : _de ? "Fehler beim Senden" : "Error during upload"}</p>`;
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
async function speakMessage(text, btn) {
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

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.email) {
        window.location.href = "profile.html";
        return;
    }

    if (btn) {
        btn.classList.add('is-loading');
        btn.innerHTML = '<span class="voice-spinner"></span>';
    }

    try {
        const response = await fetch("/api/is-premium", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email }),
        });

        const { isPremium } = await response.json();
        
        if (!isPremium) {
            if (btn) { btn.classList.remove('is-loading'); btn.innerHTML = '<i class="fas fa-microphone"></i>'; }
            window.location.href = "premium.html";
            return;
        }

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
                },
                email: user.email
            })
        });

        if (!ttsResponse.ok) {
            const errorData = await ttsResponse.json();

            if (btn) { btn.classList.remove('is-loading'); btn.innerHTML = '<i class="fas fa-microphone"></i>'; }

            if (errorData.popup) {
                openJetonsPopup();
                return;
            }

            if (errorData.redirect) {
                window.location.href = errorData.redirect;
                return;
            }

            throw new Error("Erreur API TTS Backend");
        }

        const audioBlob = await ttsResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        if (btn) {
            btn.classList.remove('is-loading');
            btn.classList.add('is-playing');
            btn.innerHTML = '<i class="fas fa-pause"></i>';
        }

        audio.play();

        audio.onended = () => {
            if (btn) {
                btn.classList.remove('is-playing');
                btn.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        };

    } catch (error) {
        console.error("❌ Erreur avec l'API TTS :", error);
        if (btn) { btn.classList.remove('is-loading'); btn.innerHTML = '<i class="fas fa-microphone"></i>'; }
    }
}



function renderQuickReplies(suggestions = []) {
  const container = document.getElementById("quick-replies");
  const messagesContainer = document.getElementById("messages");

  if (!container || !messagesContainer) return;

  // Rien à afficher → on cache
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    hideQuickReplies();
    return;
  }

  container.innerHTML = "";

  suggestions.forEach((text) => {
    const btn = document.createElement("button");
    btn.className = "quick-reply-btn";
    btn.textContent = text;

    btn.addEventListener("click", () => {
      // Comme si l'utilisateur écrivait lui-même
      addUserMessage(text, messagesContainer, scrollToBottom);
      hideQuickReplies();
    });

    container.appendChild(btn);
  });

  container.classList.remove("hidden");
}

function hideQuickReplies() {
  const container = document.getElementById("quick-replies");
  if (!container) return;
  container.classList.add("hidden");
  container.innerHTML = "";
}


function initAutoGrowTextarea() {
  const ta = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  if (!ta || !sendBtn) return;

  const MAX_ROWS = 6; // ajuste si tu veux
  const lineHeight = 22; // doit matcher ton CSS (approx ok)

  function autoGrow() {
    ta.style.height = "auto";
    const maxHeight = MAX_ROWS * lineHeight;
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
    ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
  }

ta.addEventListener("input", () => {
  autoGrow();
  updateInputHeightVar();   // 🔥 met à jour --input-h en live
});

  window.addEventListener("resize", autoGrow);

  // Enter = send, Shift+Enter = newline
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  // Init
  autoGrow();
}

// Init dès que possible
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAutoGrowTextarea);
} else {
  initAutoGrowTextarea();
}


// ==============================
// 🔙 Bouton retour : fermer le chat proprement
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("back-btn");
  if (!backBtn) return;

  backBtn.addEventListener("click", () => {
    const chatBox = document.getElementById("chat-box");
    const container = document.querySelector(".container");
    const storiesWrapper = document.querySelector(".stories-wrapper");
    const chatOptions = document.querySelector(".chat-options");
    const cards = document.getElementById("character-cards-container");
    const menu = document.querySelector(".menu");

    // 🔒 Fermer le chat
    if (chatBox) {
      chatBox.style.display = "none";
      // On remet aussi le fond comme avant
      chatBox.style.backgroundImage = "";
      chatBox.style.backgroundColor = "";
      chatBox.style.backdropFilter = "";
      chatBox.style.backgroundBlendMode = "";
    }

    // 🧱 Revenir à l’écran de sélection
    if (chatOptions) chatOptions.style.display = "flex";
    if (cards) cards.style.display = "block";
    if (storiesWrapper) storiesWrapper.style.display = "";

    // Remove conversation-mode style override if present
    const convStyle = document.getElementById("conv-hide-style");
    if (convStyle) convStyle.remove();

    // 🔁 Enlever le plein écran
    if (container) container.classList.remove("fullscreen");

    // 🍔 Ré-afficher le menu si tu l’utilises
    if (menu) menu.classList.remove("hidden");

    // 🧮 Reset des variables liées au clavier (important pour le scroll)
    document.documentElement.style.setProperty("--kb", "0px");
    // on recalcule la hauteur de la barre d’input si la fonction existe
    if (typeof updateInputHeightVar === "function") {
      updateInputHeightVar();
    }

    // 🔝 Revenir en haut (optionnel mais souvent plus clean)
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});