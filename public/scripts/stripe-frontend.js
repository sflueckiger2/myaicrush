// Définir l'URL de base dynamiquement (s'applique à localhost ou Render)
const BASE_URL = window.location.origin;

// Détecter le mode Stripe en fonction du backend
const STRIPE_MODE = window.STRIPE_MODE || "live"; // Mode "live" par défaut

console.log(`🚀 Mode Stripe actif : ${STRIPE_MODE.toUpperCase()}`);

// Charger la configuration des prix depuis pricing-config.json
async function loadPricingConfig() {
    try {
        const response = await fetch("/pricing-config.json");

        if (!response.ok) throw new Error("Impossible de charger la configuration des prix");

        const pricingConfig = await response.json();
        return pricingConfig;
    } catch (error) {
        console.error("❌ Erreur lors du chargement de la configuration des prix :", error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const pricingConfig = await loadPricingConfig();
    if (!pricingConfig) return;

    const stripeMode = window.STRIPE_MODE || "live";
    const activeTests = pricingConfig.active_tests[0]?.variants || [];
    const defaultVariants = pricingConfig.default_price.variants || [];

    const allPlans = [...activeTests, ...defaultVariants];

    const pricingContainer = document.querySelector('#pricing-container');
    if (!pricingContainer) {
        console.error("❌ Conteneur des tarifs non trouvé !");
        return;
    }

    pricingContainer.innerHTML = "";

    allPlans.forEach(plan => {
        const priceId = stripeMode === "live" ? plan.stripe_id_live : plan.stripe_id_test;

        const planHtml = `
            <div class="plan">
                <h3>${plan.name}</h3>
                <p class="price">${plan.price}€/ ${plan.duration}</p>
                <p class="description">${plan.description}</p>
                ${plan.promo ? `<span class="promo">${plan.promo}</span>` : ""}
                <button class="checkout-button" data-price-id="${priceId}">${plan.button_text}</button>
            </div>
        `;

        pricingContainer.innerHTML += planHtml;
    });

    document.querySelectorAll('.checkout-button').forEach(button => {
        button.addEventListener('click', () => {
            const priceId = button.getAttribute('data-price-id');
            const planType = button.textContent.trim();
            handleCheckout(priceId, planType);
        });
    });

    console.log("✅ Plans tarifaires générés dynamiquement !");
});

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

    startCheckout(priceId, user.email, planType);
}

// Fonction pour démarrer le paiement Stripe
async function startCheckout(priceId, email, planType) {
    try {
        if (!priceId) throw new Error('❌ Error: Price ID is missing.');
        if (!email) throw new Error('❌ Error: User email is missing.');

        console.log("📡 Envoi de la requête à Stripe avec :", {
            priceId,
            email,
            planType
        });

        const response = await fetch(`${BASE_URL}/api/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId, email, planType })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create checkout session');
        }

        const data = await response.json();
        console.log("📩 Réponse Stripe :", data);

        if (data.url) {
            window.location.href = data.url;
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
