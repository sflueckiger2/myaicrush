import { startChat, resetChatState } from './chat.js';
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


// ✅ Générer dynamiquement les options de chat avec les badges "Nouvelle" et "Vidéos disponibles"

export function generateChatOptions(characters, isPremium = false) {

    const chatOptions = document.querySelector('.chat-options');
    chatOptions.innerHTML = ''; // Nettoyer le conteneur avant d'ajouter les options

    characters.forEach(character => {
        const card = document.createElement('div');
        card.className = 'chat-card';

       // Bordure prioritaire (vert > rouge > violet > bleu)
if (character.hasVideos) {
    card.classList.add("hasVideos");
} else if (character.new) {
    card.classList.add("new");
} else if (character.hasNymphoMode) {
    card.classList.add("nympho");
} else if (character.hasAudioCall) {
    card.classList.add("callAudio");
}


        card.addEventListener('click', () => startChat(character.name));
// Déterminer les badges à afficher
let badgesToShow = [];

if (character.new) {
    badgesToShow.push({ text: "Nouveau", class: "new-badge" });
}
if (character.hasVideos) {
    badgesToShow.push({ text: "🎥 Vidéos", class: "video-badge" });
}
if (character.hasNymphoMode) {
    badgesToShow.push({ text: "🥵 Nympho", class: "nympho-badge" });
}

if (character.hasAudioCall) {
    badgesToShow.push({ text: "📞 Appel", class: "call-audio-badge" });
}

// Bordure prioritaire (vert > rouge > violet)
if (character.hasVideos) {
    card.classList.add("hasVideos");
} else if (character.new) {
    card.classList.add("new");
} else if (character.hasNymphoMode) {
    card.classList.add("nympho");
} else if (character.hasAudioCall) {
    card.classList.add("callAudio");
}


// Afficher tous les badges empilés
badgesToShow.forEach(({ text, class: className }, index) => {
    const badge = document.createElement('div');
    badge.classList.add('character-badge', className);
    badge.textContent = text;
    badge.style.top = `${10 + (index * 25)}px`; // empile les badges verticalement
    card.appendChild(badge);
});

        


        let media;

if (character.photo.endsWith('.mp4')) {
    media = document.createElement('video');
    media.src = character.photo;
    media.autoplay = true;
    media.muted = true;
    media.loop = true;
    media.playsInline = true;
} else {
    media = document.createElement('img');
    media.src = character.photo;
    media.alt = character.name;
}

media.style.width = '100%';
media.style.height = '100%';
media.style.objectFit = 'cover';


        const content = document.createElement('div');
        content.className = 'card-content';

        const title = document.createElement('h3');
        title.textContent = character.name;

        const description = document.createElement('p');
        description.textContent = character.description;

        content.appendChild(title);
        content.appendChild(description);
        card.appendChild(media);

        card.appendChild(content);
        chatOptions.appendChild(card);

       // ✅ Insérer la première bannière après la 2e IA
if (chatOptions.children.length === 2) {
    const banner1 = document.createElement("div");
    banner1.className = "horizontal-banner";
    banner1.innerHTML = `
        <a href="${isPremium ? 'jetons.html' : 'premium.html'}" target="_blank">
            <img src="images/banners/${isPremium ? 'banner1-premium' : 'banner1'}.webp" alt="Bannière 1" class="banner-image">
        </a>
    `;
    chatOptions.appendChild(banner1);
}

// ✅ Insérer la deuxième bannière après la 6e IA
if (chatOptions.children.length === 7) {
    const banner2 = document.createElement("div");
    banner2.className = "horizontal-banner";
    banner2.innerHTML = `
        <a href="${isPremium ? 'jetons.html' : 'premium.html'}" target="_blank">
            <img src="images/banners/${isPremium ? 'banner2-premium' : 'banner2'}.webp" alt="Bannière 2" class="banner-image">
        </a>
    `;
    chatOptions.appendChild(banner2);
}


    });
}



export function setupBackButton() {
    document.getElementById('back-btn').addEventListener('click', function () {
        document.querySelector('.chat-options').style.display = 'grid';
        document.getElementById('chat-box').style.display = 'none';
        document.querySelector('.header').classList.remove('hidden');
        document.querySelector('.container').classList.remove('fullscreen');
        document.querySelector('.menu').classList.remove('hidden');

        // Fermer le widget audio si actif
        const widget = document.querySelector('elevenlabs-convai');
        if (widget) widget.removeAttribute("open");

        // Réinitialiser le niveau utilisateur
        resetUserLevel(); // Appeler la fonction pour remettre le niveau à 1.0

        // Réinitialiser l'état du chat
        resetChatState();
    });
}


export function toggleSignupModal(show) {
    const signupModal = document.getElementById('signup-modal');
    if (signupModal) {
        signupModal.classList.toggle('hidden', !show); // Affiche ou masque selon le paramètre show
    }
}

document.getElementById('close-signup-modal')?.addEventListener('click', () => {
    toggleSignupModal(false); // Ferme la modal quand on clique sur "Cancel"
});
