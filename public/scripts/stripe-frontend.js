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
        console.log("📡 Configuration des prix chargée :", pricingConfig);

        if (!pricingConfig.active_tests || pricingConfig.active_tests.length === 0) {
            console.warn("⚠️ Aucun test actif trouvé, affichage du prix par défaut.");
            
            // 🔥 Log en console
            console.log("📊 Un utilisateur voit le pricing par défaut.");

            // 🔥 Event Google Analytics
            gtag('event', 'default_price_shown', {
                'event_category': 'Pricing',
                'event_label': 'Default Price Used'
            });

            return [pricingConfig.default_price]; 
        }

        let selectedTest = localStorage.getItem("selectedPricingTest");

        if (!selectedTest) {
            const randomTest = Math.floor(Math.random() * pricingConfig.active_tests.length);
            selectedTest = pricingConfig.active_tests[randomTest];
            localStorage.setItem("selectedPricingTest", JSON.stringify(selectedTest));
        } else {
            selectedTest = JSON.parse(selectedTest);
        }

        console.log("🎯 Version de l'A/B test sélectionnée :", selectedTest);

        if (!selectedTest.variants || selectedTest.variants.length === 0) {
            console.warn("⚠️ Aucun variant trouvé, affichage du prix par défaut.");
            
            // 🔥 Log en console
            console.log("📊 Un utilisateur voit le pricing par défaut.");

            // 🔥 Event Google Analytics
            gtag('event', 'default_price_shown', {
                'event_category': 'Pricing',
                'event_label': 'Default Price Used'
            });

            return [pricingConfig.default_price]; 
        }

        return selectedTest.variants;
    } catch (error) {
        console.error("❌ Erreur lors du chargement de la configuration des prix :", error);
        return [pricingConfig.default_price];
    }
}




document.addEventListener('DOMContentLoaded', async () => {
    const plans = await loadPricingConfig();
    if (!plans || plans.length === 0) {
        console.error("❌ Aucun plan tarifaire disponible !");
        return;
    }

    const pricingContainer = document.querySelector('#pricing-container');
if (!pricingContainer) {
    console.warn("⚠️ Page sans tarifs détectée, chargement annulé.");
    return;
}


    pricingContainer.innerHTML = "";

    plans.forEach(plan => {
        const priceId = STRIPE_MODE === "live" ? plan.stripe_id_live : plan.stripe_id_test;

        const planHtml = `
        <div class="pricing-card plan ${plan.promo ? "popular" : ""}">
        ${plan.promo && plan.promo !== "null" && plan.promo !== null && plan.promo.trim() !== "" ? `<div class="promo">${plan.promo}</div>` : ""}


            <h3 class="plan-title">${plan.name}</h3>
        <p class="price">${Number.isInteger(plan.price) ? plan.price : plan.price.toFixed(2)}€ / ${plan.duration}</p>

            <p class="description">${plan.description}</p>
            <button class="checkout-button" data-price-id="${priceId}" data-plan-type="${plan.name.toLowerCase()}">
                ${plan.button_text}
            </button>
        </div>
    `;
    

        pricingContainer.innerHTML += planHtml;
    });

    document.querySelectorAll('.checkout-button').forEach(button => {
        button.addEventListener('click', () => {
            const priceId = button.getAttribute('data-price-id');
            const planType = button.getAttribute('data-plan-type');
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

const selectedTest = JSON.parse(localStorage.getItem("selectedPricingTest"));
const testId = selectedTest?.id || 'default';

// Fonction pour démarrer le paiement Stripe
async function startCheckout(priceId, email, planType) {
    try {
        if (!priceId) throw new Error('❌ Error: Price ID is missing.');
        if (!email) throw new Error('❌ Error: User email is missing.');

        console.log("📡 Envoi de la requête à Stripe avec :", { priceId, email, planType });

        const response = await fetch(`${BASE_URL}/api/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId, email, planType, testId })
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
        alert('Ton abonnement est annulé.');
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

// Vérifier si on est sur la page profile.html et exécuter les fonctionnalités liées à l'abonnement
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('profile.html')) {
        console.log("🔍 Page de profil détectée, chargement des infos d'abonnement...");
        displaySubscriptionInfo();

        // Ajouter l'écouteur d'événement pour le bouton d'annulation d'abonnement
        const cancelSubscriptionButton = document.getElementById('cancel-subscription-button');
        if (cancelSubscriptionButton) {
            cancelSubscriptionButton.addEventListener('click', async () => {
                const confirmCancel = confirm('Es-tu sûr de vouloir annuler ton abonnement ?');
                if (confirmCancel) {
                    await cancelSubscription(); // Exécute l'annulation
                }
            });
        } else {
            console.warn("⚠️ Bouton d'annulation d'abonnement non trouvé !");
        }
    }
});
