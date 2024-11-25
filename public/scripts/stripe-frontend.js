document.addEventListener('DOMContentLoaded', () => {
    const checkoutButton = document.querySelector('#checkoutButton');
    checkoutButton.addEventListener('click', () => {
        startCheckout();
    });
});

async function startCheckout() {
    const priceId = 'price_1QP4dCAOSHX0SgbTY5N4QrsW'; // Remplace par ton ID de prix Stripe
    try {
        const response = await fetch('http://localhost:4000/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId }),
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
