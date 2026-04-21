import { addUserMessage, startChat } from './chat.js';
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

    // Cleanup: remove any leftover conv-hide-style from previous navigation
    const staleStyle = document.getElementById("conv-hide-style");
    if (staleStyle && !new URLSearchParams(window.location.search).get("chat")) {
      staleStyle.remove();
    }

    // Auto-open chat from ?chat=CharacterName (e.g. from conversations page)
    const urlChat = new URLSearchParams(window.location.search).get("chat");
    if (urlChat || window.__chatConvMode) {
      const chatName = urlChat || localStorage.getItem("__pendingChat");
      const match = chatName && characters.find(c => c.name === chatName);
      if (match) {
        startChat(chatName);
        window.history.replaceState({}, "", window.location.pathname);

        // Remove loader once chat-box is visible
        const chatBox = document.getElementById('chat-box');
        if (chatBox) {
          const obs = new MutationObserver(() => {
            if (getComputedStyle(chatBox).display !== 'none') {
              const ldr = document.getElementById('loader');
              if (ldr) { ldr.style.opacity = '0'; setTimeout(() => ldr.remove(), 300); }
              obs.disconnect();
            }
          });
          obs.observe(chatBox, { attributes: true, attributeFilter: ['style'] });
          setTimeout(() => { const ldr = document.getElementById('loader'); if (ldr) { ldr.style.opacity = '0'; setTimeout(() => ldr.remove(), 300); } obs.disconnect(); }, 6000);
        }
      }
    }

    // Initialiser les événements UI
    initializeUIEvents(sendBtn, userInput, (message) => {
        if (message.trim() === '') return;
        addUserMessage(message, messages, () => {
            messages.scrollTop = messages.scrollHeight;
        });
    });

    const profilePic = document.querySelector('.chat-profile-pic');
if (profilePic) {
    profilePic.addEventListener('click', function () {
        const currentCharacterName = document.getElementById('chat-name').textContent;
        openProfileModal(currentCharacterName);
    });
}


    document.getElementById('profile-modal').addEventListener('click', closeProfileModal);
    document.getElementById('close-modal-btn').addEventListener('click', closeProfileModal);

    setupBackButton();
});
