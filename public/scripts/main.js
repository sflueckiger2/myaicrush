import { addUserMessage } from './chat.js';
import { initializeUIEvents, setupBackButton } from './ui.js';
import { loadCharacters } from './data.js';
import { openProfileModal, closeProfileModal } from './profile.js';

document.addEventListener('DOMContentLoaded', async () => {
    const messages = document.getElementById('messages');
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');

    // Charger les personnages
    const characters = await loadCharacters();
    console.log('Characters loaded:', characters);

    // Initialiser les événements UI
    initializeUIEvents(sendBtn, userInput, (message) => {
        if (message.trim() === '') return;

        // Passe le texte saisi à `addUserMessage`
        addUserMessage(message, messages, () => {
            messages.scrollTop = messages.scrollHeight;
        });
    });

    // Ajouter un écouteur de clic sur la photo de profil dans le chat
    document.querySelector('.chat-profile-pic').addEventListener('click', function () {
        const currentCharacterName = document.getElementById('chat-name').textContent;
        openProfileModal(currentCharacterName);
    });

    // Ajouter un écouteur de clic pour fermer le modal
    document.getElementById('profile-modal').addEventListener('click', closeProfileModal);

    // Ajouter un écouteur de clic pour fermer le modal via la croix
    document.getElementById('close-modal-btn').addEventListener('click', closeProfileModal);

    // Setup back button
    setupBackButton();
});
