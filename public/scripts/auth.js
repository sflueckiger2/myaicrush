// auth.js
const BASE_URL = window.location.origin; // URL dynamique


// Fonction pour ouvrir la modal d'inscription
export function openSignupModal() {
    const signupModal = document.getElementById('signup-modal'); // Modal pour l'inscription
    if (!signupModal) {
        console.error('Signup modal not found.');
        return;
    }
    signupModal.classList.remove('hidden'); // Affiche la modal
}

// Fonction pour fermer la modal d'inscription
export function closeSignupModal() {
    const signupModal = document.getElementById('signup-modal'); // Modal pour l'inscription
    if (!signupModal) {
        console.error('Signup modal not found.');
        return;
    }
    signupModal.classList.add('hidden'); // Cache la modal
}

// Gestion des événements DOM
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const closeModalButton = document.getElementById('close-signup-modal'); // Bouton pour fermer la modal

    // Événement pour fermer la modal via le bouton de fermeture
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeSignupModal);
    }

    // Gestion de la soumission du formulaire d'inscription
    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value.trim();

            try {
                const response = await fetch(`${BASE_URL}/api/signup`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                  });
                  

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to sign up');
                }

                const data = await response.json();
                alert(data.message);

                // Stocker les informations de l'utilisateur dans localStorage
                localStorage.setItem('user', JSON.stringify({ email, password }));

                // Fermer la modal après une inscription réussie
                closeSignupModal();
            } catch (error) {
                console.error('Error during signup:', error);
                alert('Signup failed. Please try again.');
            }
        });
    } else {
        console.error('Signup form not found.');
    }
});
