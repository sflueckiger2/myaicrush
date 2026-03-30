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
        alert(error.message || (navigator.language?.startsWith("fr") ? "Une erreur est survenue. Veuillez réessayer." : "An error occurred. Please try again."));
    }
}




// ✅ Fonction avec affichage dynamique du montant, intervalle et date de fin si abo annulé
async function displaySubscriptionInfo() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.email) return;

    const response = await fetch('/api/get-user-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    });

    if (!response.ok) throw new Error("Impossible de récupérer l'abonnement");

    const data = await response.json();
    const container = document.querySelector('.profile-section.subscription');

    if (!container) return;

    if (!data || !data.status) {
      container.innerHTML = '<p>Aucun abonnement actif.</p>';
      return;
    }

    const endDate = data.current_period_end
      ? new Date(data.current_period_end * 1000).toLocaleDateString('fr-FR')
      : null;

    // Abonnement annulé mais encore actif
    if (
      data.status === 'canceled' ||
      (data.status === 'active' && data.cancel_at_period_end)
    ) {
      container.innerHTML = `
        <p>Abonnement annulé.</p>
        <p>Valable jusqu’au ${endDate}</p>
      `;
      return;
    }

    // Abonnement actif normal
    let intervalLabel = '';

if (data.interval === 'month' && data.interval_count === 3) {
  intervalLabel = 'trimestre';
} else if (data.interval === 'month') {
  intervalLabel = 'mois';
} else if (data.interval === 'year') {
  intervalLabel = 'an';
} else if (data.interval === 'week') {
  intervalLabel = 'semaine';
} else if (data.interval === 'day') {
  intervalLabel = 'jour';
} else {
  intervalLabel = data.interval;
}


   container.innerHTML = `
  <p>Abonnement actif</p>
  <p>${data.amount} € / ${intervalLabel}</p>
  ${endDate ? `<p>Prochain renouvellement : ${endDate}</p>` : ''}
`;


  } catch (err) {
    console.error('❌ Erreur abonnement :', err);
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
  const confirmCancel = confirm("Attention, si tu annules ton abonnement, tu perds tous les avantages premium de MyAiCrush");
  if (confirmCancel) {
    await cancelSubscriptionWithLoader();
  }
});

        } else {
            console.warn("⚠️ Bouton d'annulation d'abonnement non trouvé !");
        }
    }
});


async function cancelSubscriptionWithLoader() {
  const loader = document.getElementById('cancel-loader-overlay');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user || !user.email) {
    alert("Tu dois être connecté pour annuler ton abonnement.");
    return;
  }

  loader.classList.remove('hidden');

  try {
    const res = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      alert("Ton abonnement a bien été annulé. Il restera actif jusqu’à la fin de la période en cours.");
      location.reload();
    } else {
      alert(data.message || "Une erreur est survenue lors de l’annulation.");
    }
  } catch (error) {
    console.error("❌ Erreur annulation :", error);
    alert("Erreur réseau lors de l’annulation.");
  } finally {
    loader.classList.add('hidden');
  }
}






