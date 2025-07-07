// Définir l'URL de base dynamiquement
const BASE_URL = window.location.origin;

// Détecter le mode Stripe en fonction du backend
const STRIPE_MODE = window.STRIPE_MODE || "live"; // Mode "live" par défaut

// Prix des jetons selon l'environnement (test ou live)
const STRIPE_PRICE_IDS = {
    "10": STRIPE_MODE === "live" ? "price_1R3eoAAOSHX0SgbTbme4bKp1" : "price_1R3epsAOSHX0SgbTsDSpNp1n",
    "50": STRIPE_MODE === "live" ? "price_1R3eoAAOSHX0SgbTtyLJcLqm" : "price_1R3eqfAOSHX0SgbTkfKuzSK6",
    "100": STRIPE_MODE === "live" ? "price_1R3eoAAOSHX0SgbTKRTHbCOe" : "price_1R3erLAOSHX0SgbT9WkZvQt6",
     "300": STRIPE_MODE === "live" ? "price_1R7IBOAOSHX0SgbTZiOOaMie" : "price_1R7IcuAOSHX0SgbTucYIAHAP",
     "700": STRIPE_MODE === "live" ? "price_1RiHu2AOSHX0SgbT3dOeqWea" : "price_1RiHybAOSHX0SgbTLjP9DjQD",
     "1000": STRIPE_MODE === "live" ? "price_1RiHw8AOSHX0SgbTWoS6CaBS" : "price_1RiHzCAOSHX0SgbT5NK40y8K"
};

// ✅ Autoriser le clic sur les images avec data-tokens
document.querySelectorAll('.token-image[data-tokens]').forEach(img => {
    img.addEventListener('click', () => {
        const tokensAmount = img.dataset.tokens;
        handleTokenCheckout(tokensAmount);
    });
});


document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tokenCheckoutButton').forEach(button => {
        button.addEventListener('click', () => {
            const tokensAmount = button.dataset.tokens;
            handleTokenCheckout(tokensAmount);
        });
    });

    // ✅ Vérifier si un paiement a été effectué après redirection
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
        checkPaymentAndUpdateTokens(sessionId);
    }
});

// Fonction pour gérer l'achat de jetons via Stripe
function handleTokenCheckout(tokensAmount) {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user || !user.email) {
        alert('Veuillez vous connecter pour acheter des jetons.');
        window.location.href = 'profile.html';
        return;
    }

    const priceId = STRIPE_PRICE_IDS[tokensAmount];

    if (!priceId) {
        alert('Erreur : prix non défini pour ce montant de jetons.');
        return;
    }

    console.log(`🛒 Achat de ${tokensAmount} jetons avec Price ID: ${priceId}`);

    startTokenCheckout(tokensAmount, user.email);
}

// Fonction pour démarrer la session de paiement Stripe
async function startTokenCheckout(tokensAmount, email) {
    try {
        const response = await fetch(`${BASE_URL}/api/buy-tokens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokensAmount, email })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la création de la session Stripe.');
        }

        const data = await response.json();
        console.log("📩 Réponse Stripe :", data);

        if (data.url) {
            window.location.href = data.url; // ✅ Redirige vers Stripe
        }
    } catch (error) {
        console.error('❌ Erreur Stripe:', error.message);
        alert(error.message || 'Une erreur est survenue, veuillez réessayer.');
    }
}

// ✅ Fonction pour vérifier le paiement et mettre à jour les jetons
async function checkPaymentAndUpdateTokens(sessionId) {
    console.log("📡 Vérification du paiement via Stripe...");
    try {
        const response = await fetch(`${BASE_URL}/api/confirm-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });

        const data = await response.json();
        if (data.success) {
            console.log(`✅ Paiement validé, ${data.tokens} jetons ajoutés.`);
            alert(`Achat réussi ! Vous avez reçu ${data.tokens} jetons.`);

            // ✅ Supprimer session_id de l'URL pour éviter les doublons
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            console.error("❌ Erreur de paiement :", data.message);
            alert("Erreur lors de la validation du paiement.");
        }
    } catch (error) {
        console.error("❌ Erreur réseau :", error);
        alert("Impossible de vérifier le paiement.");
    }
}
