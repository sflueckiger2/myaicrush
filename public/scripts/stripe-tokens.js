// Définir l'URL de base dynamiquement
const BASE_URL = window.location.origin;

// Détecter le mode Stripe en fonction du backend
const STRIPE_MODE = window.STRIPE_MODE || "live"; // Mode "live" par défaut

// Prix des jetons selon l'environnement (test ou live)
const STRIPE_PRICE_IDS = {
    "10": window.STRIPE_MODE === "live" ? "price_1R3eoAAOSHX0SgbTbme4bKp1" : "price_1R3epsAOSHX0SgbTsDSpNp1n",
    "50": window.STRIPE_MODE === "live" ? "price_1R3eoAAOSHX0SgbTtyLJcLqm" : "price_1R3eqfAOSHX0SgbTkfKuzSK6",
    "100": window.STRIPE_MODE === "live" ? "price_1R3eoAAOSHX0SgbTKRTHbCOe" : "price_1R3erLAOSHX0SgbT9WkZvQt6"
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tokenCheckoutButton').forEach(button => {
        button.addEventListener('click', () => {
            const tokensAmount = button.dataset.tokens;
            handleTokenCheckout(tokensAmount);
        });
    });
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
            body: JSON.stringify({ tokensAmount, email }) // ✅ On envoie bien `tokensAmount` et `email`
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la création de la session Stripe.');
        }

        const data = await response.json();
        console.log("📩 Réponse Stripe :", data);

        if (data.url) {
            window.location.href = data.url;
        }
    } catch (error) {
        console.error('❌ Erreur Stripe:', error.message);
        alert(error.message || 'Une erreur est survenue, veuillez réessayer.');
    }
}
