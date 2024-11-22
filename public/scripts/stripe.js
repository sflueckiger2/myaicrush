const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Charge la clé secrète depuis .env

async function createCheckoutSession(priceId) {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: 'http://localhost:3000/success',
            cancel_url: 'http://localhost:3000/cancel',
        });
        return session;
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = { createCheckoutSession };