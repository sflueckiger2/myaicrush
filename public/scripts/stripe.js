const stripe = require('stripe')(process.env.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); // Charge la clé secrète depuis .env

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