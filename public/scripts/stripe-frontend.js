document.addEventListener('DOMContentLoaded', () => {
    // Boutons pour les différents plans
    const monthlyCheckoutButton = document.querySelector('#monthlyCheckoutButton');
    const annualCheckoutButton = document.querySelector('#annualCheckoutButton');
    const cancelSubscriptionButton = document.querySelector('#cancel-subscription-button');

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

    // Gérer la désinscription
    if (cancelSubscriptionButton) {
        cancelSubscriptionButton.addEventListener('click', () => {
            console.log('Cancel Subscription button clicked'); // Vérifie si le clic est détecté
            const confirmCancel = confirm('Are you sure you want to cancel your subscription?');
            if (confirmCancel) {
                cancelSubscription();
            }
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

// Fonction pour annuler un abonnement Stripe
async function cancelSubscription() {
    try {
        // Récupère les informations de l'utilisateur depuis le localStorage
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.email) {
            alert('No user information found. Please log in first.');
            return;
        }

        const response = await fetch('http://localhost:4000/api/cancel-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }), // Envoie l'email au backend pour l'identification
        });

        const data = await response.json();
        if (response.ok) {
            alert('Your subscription has been cancelled.');
            // Mettre à jour le statut premium dans le localStorage
            localStorage.setItem('user', JSON.stringify({ ...user, isPremium: false }));

            // Masquer l'encart de désinscription
            const unsubscribeContainer = document.querySelector('#unsubscribe-container');
            if (unsubscribeContainer) {
                unsubscribeContainer.classList.add('hidden');
            }
        } else {
            console.error('Erreur lors de l\'annulation de l\'abonnement:', data.message);
            alert(data.message || 'Failed to cancel subscription.');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('An error occurred while cancelling the subscription. Please try again.');
    }
}
