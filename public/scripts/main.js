import { addUserMessage } from './chat.js';
import { initializeUIEvents, setupBackButton } from './ui.js';
import { loadCharacters } from './data.js';
import { openProfileModal, closeProfileModal } from './profile.js';

document.addEventListener('DOMContentLoaded', async () => {
    const messages = document.getElementById('messages');
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');

    const characters = await loadCharacters();
    console.log('✅ Characters loaded:', characters.length);

    // === Créer une bannière personnalisée ===
    function createBannerElement(id, imagePath, link) {
        const banner = document.createElement("div");
        banner.className = "horizontal-banner";
        banner.innerHTML = `
            <a href="${link}" target="_blank">
                <img src="${imagePath}" alt="Bannière ${id}" class="banner-image">
            </a>
        `;
        return banner;
    }

    // === Insertion avec confirmation dans la console ===
    function insertBannersWhenReady(attempts = 0) {
    const container = document.getElementById("character-cards-container");
    if (!container) return;

    const cards = Array.from(container.children).filter(el => el.classList.contains('chat-card'));

    // ✅ Insertion une seule fois
    if (cards.length >= 7 && !container.querySelector('.horizontal-banner')) {
        const banner1 = createBannerElement(1, "images/banners/banner1.webp", "premium.html");
        const banner2 = createBannerElement(2, "images/banners/banner2.webp", "premium.html");

        container.insertBefore(banner1, cards[2]);
        container.insertBefore(banner2, cards[7]);
        console.log("✅ Bannières insérées");
        return; // 🛑 STOP ici
    }

    // ✅ Ne tente pas indéfiniment (max 20 fois)
    if (attempts < 20) {
        setTimeout(() => insertBannersWhenReady(attempts + 1), 300);
    } else {
        console.warn("⏱️ Abandon : pas de bannières insérées après 20 tentatives.");
    }
}


    insertBannersWhenReady();

    // === UI events
    initializeUIEvents(sendBtn, userInput, (message) => {
        if (message.trim() === '') return;
        addUserMessage(message, messages, () => {
            messages.scrollTop = messages.scrollHeight;
        });
    });

    document.querySelector('.chat-profile-pic').addEventListener('click', function () {
        const currentCharacterName = document.getElementById('chat-name').textContent;
        openProfileModal(currentCharacterName);
    });

    document.getElementById('profile-modal').addEventListener('click', closeProfileModal);
    document.getElementById('close-modal-btn').addEventListener('click', closeProfileModal);

    setupBackButton();
});
