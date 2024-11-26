document.addEventListener('DOMContentLoaded', () => {
    // Boutons pour les différents plans
    const monthlyCheckoutButton = document.querySelector('#monthlyCheckoutButton');
    const annualCheckoutButton = document.querySelector('#annualCheckoutButton');

    // Ajouter les événements de clic aux boutons
    if (monthlyCheckoutButton) {
        monthlyCheckoutButton.addEventListener('click', () => {
            startCheckout('price_1QP4dCAOSHX0SgbTY5N4QrsW'); // Remplace par l'ID Stripe pour le plan mensuel
        });
    }

    if (annualCheckoutButton) {
        annualCheckoutButton.addEventListener('click', () => {
            startCheckout('price_1QPRXpAOSHX0SgbT8GfUUtvL'); // Remplace par l'ID Stripe pour le plan annuel
        });
    }
});

// Fonction pour démarrer le paiement Stripe
async function startCheckout(priceId) {
    try {
        const response = await fetch('http://localhost:4000/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId }), // Envoie l'ID du prix choisi au backend
        });

        const data = await response.json();
        if (data.url) {
            window.location.href = data.url; // Redirige l'utilisateur vers Stripe Checkout
        } else {
            console.error('Erreur lors de la création de la session Stripe:', data.message);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}
