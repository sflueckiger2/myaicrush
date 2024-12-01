document.addEventListener('DOMContentLoaded', () => {
    const monthlyCheckoutButton = document.querySelector('#monthlyCheckoutButton');
    const annualCheckoutButton = document.querySelector('#annualCheckoutButton');
    const cancelSubscriptionButton = document.querySelector('#cancel-subscription-button');

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

// Fonction pour démarrer le paiement Stripe
async function startCheckout(priceId) {
    try {
        const response = await fetch('http://localhost:4000/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId }),
        });

        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
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
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.email) {
            alert('No user information found. Please log in first.');
            return;
        }

        const response = await fetch('http://localhost:4000/api/cancel-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
        });

        const data = await response.json();
        if (response.ok) {
            alert('Your subscription has been cancelled.');
            localStorage.setItem('user', JSON.stringify({ ...user, isPremium: false }));
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

// Fonction pour récupérer et afficher l'abonnement actuel
async function displaySubscriptionInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.email) {
            console.log('Utilisateur non connecté.');
            return;
        }

        const response = await fetch('http://localhost:4000/api/get-user-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
        });

        const data = await response.json();
        const subscriptionContainer = document.querySelector('.profile-section.subscription');

        if (response.ok) {
            if (data.status === 'inactive') {
                subscriptionContainer.innerHTML = '<p>You have no active subscription.</p>';
            } else {
                subscriptionContainer.innerHTML = `
                    <p>Current subscription: ${data.subscription.amount} €/${data.subscription.interval}</p>
                    ${data.status === 'cancelled' ? '<p>Your subscription is set to cancel at the end of the billing period.</p>' : ''}
                `;
            }
        } else {
            console.error('Erreur lors de la récupération de l\'abonnement:', data.message);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}
