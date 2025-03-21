// Définir l'URL de base dynamiquement (s'applique à localhost ou Render)
const BASE_URL = window.location.origin;

// Détecter le mode Stripe en fonction du backend
const STRIPE_MODE = window.STRIPE_MODE || "live"; // Mode "live" par défaut

// Récupération des IDs de prix en fonction du mode Stripe
const STRIPE_PRICE_ID_MONTHLY = STRIPE_MODE === "live"
    ? "price_1R288qAOSHX0SgbTCgRDHuka" // Live Monthly
    : "price_1QP4dCAOSHX0SgbTY5N4QrsW"; // Test Monthly

const STRIPE_PRICE_ID_ANNUAL = STRIPE_MODE === "live"
    ? "price_1R28ADAOSHX0SgbTfwDtAQRQ" // Live Annual
    : "price_1QPRXpAOSHX0SgbT8GfUUtvL"; // Test Annual

console.log(`🚀 Mode Stripe actif : ${STRIPE_MODE.toUpperCase()}`);
console.log(`💰 ID Prix Mensuel : ${STRIPE_PRICE_ID_MONTHLY || "❌ Non défini"}`);
console.log(`💰 ID Prix Annuel : ${STRIPE_PRICE_ID_ANNUAL || "❌ Non défini"}`);

document.addEventListener('DOMContentLoaded', () => {
    const monthlyCheckoutButton = document.querySelector('#monthlyCheckoutButton');
    const annualCheckoutButton = document.querySelector('#annualCheckoutButton');
    const cancelSubscriptionButton = document.querySelector('#cancel-subscription-button');

    if (monthlyCheckoutButton) {
        monthlyCheckoutButton.addEventListener('click', () => {
            handleCheckout(STRIPE_PRICE_ID_MONTHLY, "monthly");
        });
    }

    if (annualCheckoutButton) {
        annualCheckoutButton.addEventListener('click', () => {
            handleCheckout(STRIPE_PRICE_ID_ANNUAL, "annual");
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




//fonction pour le JSON AB TEST PRIX

// Charger la configuration des prix depuis pricing-config.json
async function loadPricingConfig() {
    try {
        const response = await fetch('/IA/pricing-config.json'); // 🔥 Ajuste le chemin si nécessaire
        if (!response.ok) throw new Error("Impossible de charger la configuration des prix");

        const pricingConfig = await response.json();
        return pricingConfig;
    } catch (error) {
        console.error("❌ Erreur lors du chargement de la configuration des prix :", error);
        return null;
    }
}


// Fonction pour vérifier l'utilisateur et démarrer le paiement Stripe
function handleCheckout(priceId, planType) {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user || !user.email) {
        alert('Veuillez vous connecter pour continuer.');
        window.location.href = 'profile.html';
        return;
    }

    if (!priceId) {
        alert('Erreur : ID de prix non défini.');
        return;
    }

    console.log(`🛒 Tentative d'achat pour ${planType} avec Price ID: ${priceId}`);
    
    // Démarrer le paiement Stripe avec l'ID du prix et l'email
    startCheckout(priceId, user.email, planType);
}

// Fonction pour démarrer le paiement Stripe
async function startCheckout(priceId, email, planType) {
    try {
        if (!priceId) {
            throw new Error('❌ Error: Price ID is missing.');
        }
        if (!email) {
            throw new Error('❌ Error: User email is missing.');
        }

        console.log("📡 Envoi de la requête à Stripe avec :", {
            priceId,
            email,
            planType
        });

        const response = await fetch(`${BASE_URL}/api/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId, email, planType }) // 🔥 Envoi de l'email et du plan
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
        console.error('❌ Erreur Stripe:', error.message);
        alert(error.message || 'An error occurred while creating the Stripe session. Please try again.');
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
        console.error('❌ Erreur:', error);
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
        console.error('❌ Erreur:', error);
    }
}
