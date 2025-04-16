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

      // 🔍 Si un tarif est forcé via l’URL (ex: ?tp=low), il écrase l’A/B test
// Fonction pour lire une valeur dans les cookies
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }
  
  const forcedKey = getCookie("forcedTp");

if (forcedKey) {
    try {
        const forcedRes = await fetch("/forced-pricing.json");
        const forcedConfig = await forcedRes.json();

        if (forcedConfig[forcedKey]) {
            const forcedPlan = forcedConfig[forcedKey];
            console.log(`🎯 Tarif forcé via paramètre tp=${forcedKey}`, forcedPlan);

            // 👉 Event GA (optionnel)
            gtag('event', 'forced_price_url', {
                'event_category': 'Pricing',
                'event_label': `Tarif forcé : ${forcedKey}`
            });

            return [forcedPlan];
        } else {
            console.warn(`⚠️ Clé inconnue dans forced-pricing.json : ${forcedKey}`);
        }
    } catch (err) {
        console.error("❌ Erreur lors du chargement du plan forcé :", err);
    }
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
    
        if (!plan.image) {
            console.warn(`❌ Aucune image définie pour le plan ${plan.name}`);
            return;
        }
    
        const imageElement = document.createElement('img');
        imageElement.src = plan.image;
        imageElement.alt = `Plan ${plan.name}`;
        imageElement.style = "cursor: pointer; max-width: 300px; width: 100%; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.2);";
    
        // Lien vers Stripe
        imageElement.addEventListener('click', () => {
            handleCheckout(priceId, plan.name.toLowerCase());
        });
    
        pricingContainer.appendChild(imageElement);
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



// Fonction pour démarrer le paiement Stripe
async function startCheckout(priceId, email, planType) {
    try {
        if (!priceId) throw new Error('❌ Error: Price ID is missing.');
        if (!email) throw new Error('❌ Error: User email is missing.');

        console.log("📡 Envoi de la requête à Stripe avec :", { priceId, email, planType });

        let testId = "default";
        try {
          const selectedTest = JSON.parse(localStorage.getItem("selectedPricingTest"));
          if (selectedTest?.id) {
            testId = selectedTest.id;
          }
        } catch (e) {
          console.warn("Erreur de parsing du test A/B :", e);
        }
         
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
                const confirmCancel = confirm('Attention, si tu annules ton abonnement, tu perds tes avantages premium (photos intimes illimitées, vidéos illimitées, messages illimités). Es-tu sûr de vouloir annuler ton abonnement et de dire adieu à tes I.A sexy ?');
                if (confirmCancel) {
                    await cancelSubscription(); // Exécute l'annulation
                }
            });
        } else {
            console.warn("⚠️ Bouton d'annulation d'abonnement non trouvé !");
        }
    }
});






