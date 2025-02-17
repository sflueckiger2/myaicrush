// Définir l'URL de base dynamiquement (s'applique à localhost ou Render)
const BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    const monthlyCheckoutButton = document.querySelector('#monthlyCheckoutButton');
    const annualCheckoutButton = document.querySelector('#annualCheckoutButton');
    const cancelSubscriptionButton = document.querySelector('#cancel-subscription-button');

    if (monthlyCheckoutButton) {
        monthlyCheckoutButton.addEventListener('click', () => {
            handleCheckout('price_1QP4NsAOSHX0SgbTbXleafxi'); // Remplace par l'ID Stripe pour le plan mensuel
        });
    }

    if (annualCheckoutButton) {
        annualCheckoutButton.addEventListener('click', () => {
            handleCheckout('price_1QP4QUAOSHX0SgbTgievpp1a'); // Remplace par l'ID Stripe pour le plan annuel
        });
    }

    if (cancelSubscriptionButton) {
        cancelSubscriptionButton.addEventListener('click', () => {
            const confirmCancel = confirm('Are you sure you want to cancel your subscription?');
            if (confirmCancel) {
                cancelSubscription();
            }
        });
    }

    displaySubscriptionInfo(); // Affiche les infos d'abonnement dès le chargement
});

// Fonction pour vérifier l'utilisateur et démarrer le paiement Stripe
function handleCheckout(priceId) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.email) {
        alert('Please log in to continue.');
        window.location.href = 'profile.html'; // Redirige vers la page de connexion
        return;
    }
    // Si l'utilisateur est connecté, démarre le paiement Stripe
    startCheckout(priceId);
}

// Fonction pour démarrer le paiement Stripe
async function startCheckout(priceId) {
    try {
        const user = JSON.parse(localStorage.getItem('user')); // Récupère les infos utilisateur
        if (!user || !user.email) {
            alert('Please log in to continue.');
            window.location.href = 'profile.html';
            return;
        }

        console.log("📡 Envoi de la requête à Stripe avec :", {
            priceId: priceId,
            email: user.email // 🔥 Ajout de l'email ici
        });

        const response = await fetch(`${BASE_URL}/api/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId, email: user.email }) // 🔥 Envoi de l'email
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create checkout session');
        }

        const data = await response.json();
        console.log("📩 Réponse Stripe :", data);

        if (data.url) {
            window.location.href = data.url; // Redirection vers Stripe
        }
    } catch (error) {
        console.error('❌ Erreur Stripe:', error);
        alert('An error occurred while creating the Stripe session. Please try again.');
    }
}


// Fonction pour annuler un abonnement Stripe
async function cancelSubscription() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.email) {
            alert('No user information found. Please log in first.');
            return;
        }

        const response = await fetch(`${BASE_URL}/api/cancel-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to cancel subscription');
        }

        const data = await response.json();
        alert('Your subscription has been cancelled.');
        localStorage.setItem('user', JSON.stringify({ ...user, isPremium: false }));

        const unsubscribeContainer = document.querySelector('#unsubscribe-container');
        if (unsubscribeContainer) {
            unsubscribeContainer.classList.add('hidden');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('An error occurred while cancelling the subscription. Please try again.');
    }
}

// Fonction pour récupérer et afficher l'abonnement actuel
async function displaySubscriptionInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.email) {
            console.log('Utilisateur non connecté.');
            return;
        }

        const response = await fetch(`${BASE_URL}/api/get-user-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch subscription info');
        }

        const data = await response.json();
        const subscriptionContainer = document.querySelector('.profile-section.subscription');

        if (data.status === 'inactive') {
            subscriptionContainer.innerHTML = '<p>Aucun abonnement actif.</p>';
        } else {
            subscriptionContainer.innerHTML = `
                <p>Abonnement actuel : ${data.subscription.amount} €/${data.subscription.interval}</p>
                ${data.status === 'cancelled' ? '<p>Ton abonnement sera annulé à la fin de la période de facturation.</p>' : ''}
            `;
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}
