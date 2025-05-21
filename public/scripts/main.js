import { addUserMessage } from './chat.js';
import { initializeUIEvents, setupBackButton, generateChatOptions } from './ui.js';
import { loadCharacters } from './data.js';
import { openProfileModal, closeProfileModal } from './profile.js';

document.addEventListener('DOMContentLoaded', async () => {
    const messages = document.getElementById('messages');
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');

    // Charger les personnages
    const characters = await loadCharacters();
    console.log('✅ Characters loaded:', characters.length);

    // 🔍 Vérifier statut premium
    let isPremium = false;
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.email) {
        try {
            const res = await fetch('/api/is-premium', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            });
            const data = await res.json();
            isPremium = !!data.isPremium;
            console.log("👑 Utilisateur premium :", isPremium);
        } catch (err) {
            console.error('❌ Erreur vérif premium :', err);
        }
    }

    // ✅ Afficher les options de chat avec les bonnes bannières
    generateChatOptions(characters, isPremium);

    // Initialiser les événements UI
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
