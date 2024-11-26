const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Charge la clé secrète depuis .env

async function createCheckoutSession(priceId) {
    console.log('createCheckoutSession appelé avec Price ID :', priceId); // Log le Price ID pour diagnostic

    try {
        // Vérifie que la clé API Stripe est correctement chargée
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('Erreur : Clé API Stripe non définie dans .env');
            throw new Error('STRIPE_SECRET_KEY non définie');
        }
        console.log('Clé API Stripe utilisée :', process.env.STRIPE_SECRET_KEY);

        // Crée une session Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: 'http://localhost:3000/success',
            cancel_url: 'http://localhost:3000/premium.html',
        });

        console.log('Session Checkout créée avec succès :', session.url); // Log l'URL de la session
        return session;
    } catch (error) {
        console.error('Erreur dans createCheckoutSession :', error.message); // Log des erreurs
        throw new Error(error.message);
    }
}

module.exports = { createCheckoutSession };
