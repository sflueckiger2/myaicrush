const stripeSecretKey = process.env.STRIPE_MODE === "live"
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST;

const stripe = require('stripe')(stripeSecretKey);

console.log(`🎯 Mode Stripe dans stripe.js : ${process.env.STRIPE_MODE.toUpperCase()}`);
console.log(`🔑 Clé API Stripe utilisée : ${stripeSecretKey.startsWith("sk_live") ? "LIVE" : "TEST"}`);


// Fonction pour créer une session de paiement Stripe
async function createCheckoutSession(priceId) {
    console.log('createCheckoutSession appelé avec Price ID :', priceId);

    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('Erreur : Clé API Stripe non définie dans .env');
            throw new Error('STRIPE_SECRET_KEY non définie');
        }

        const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'; // Utilise l'URL dynamique

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${BASE_URL}/confirmation.html`,
            cancel_url: `${BASE_URL}/premium.html`,
        });

        console.log('Session Checkout créée avec succès :', session.url);
        return session;
    } catch (error) {
        console.error('Erreur dans createCheckoutSession :', error.message);
        throw new Error(error.message);
    }
}

// Fonction pour annuler un abonnement Stripe
async function cancelSubscription(email) {
    try {
        console.log('Annulation d\'abonnement pour email :', email);

        const customers = await stripe.customers.search({
            query: `email:'${email}'`,
        });

        if (customers.data.length === 0) {
            console.error('Client non trouvé pour cet email');
            throw new Error('Client non trouvé');
        }

        const customer = customers.data[0];

        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
        });

        if (subscriptions.data.length === 0) {
            console.error('Aucun abonnement actif trouvé pour ce client');
            throw new Error('Aucun abonnement actif trouvé');
        }

        const subscriptionId = subscriptions.data[0].id;

        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });

        console.log('Abonnement annulé avec succès pour le client :', email);
        return {
            success: true,
            message: 'Subscription successfully marked for cancellation at the end of the billing period.',
        };
    } catch (error) {
        console.error('Erreur lors de l\'annulation de l\'abonnement :', error.message);
        throw new Error(error.message);
    }
}

// Fonction pour récupérer l'abonnement actuel de l'utilisateur
async function getUserSubscription(email) {
    try {
        console.log('Recherche de l\'abonnement pour email :', email);

        const customers = await stripe.customers.search({
            query: `email:'${email}'`,
        });

        if (customers.data.length === 0) {
            console.error('Client non trouvé pour cet email');
            return { status: 'inactive', subscription: null };
        }

        const customer = customers.data[0];

        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
        });

        if (subscriptions.data.length === 0) {
            console.log('Aucun abonnement trouvé pour cet utilisateur');
            return { status: 'inactive', subscription: null };
        }

        const subscription = subscriptions.data[0];
        const status = subscription.cancel_at_period_end ? 'cancelled' : subscription.status;

        console.log('Abonnement trouvé avec succès pour email :', email);
        return {
            status,
            subscription: {
                id: subscription.id,
                amount: subscription.items.data[0].price.unit_amount / 100,
                interval: subscription.items.data[0].price.recurring.interval,
            },
        };
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'abonnement :', error.message);
        throw new Error(error.message);
    }
}

// Fonction pour créer une session de paiement pour l'achat de jetons
async function createTokenCheckoutSession(tokensAmount, email) {
    console.log('🛒 Création d\'une session pour l\'achat de jetons:', tokensAmount, 'jetons pour', email);

    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('❌ Erreur : Clé API Stripe non définie dans .env');
            throw new Error('STRIPE_SECRET_KEY non définie');
        }

        const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'; // Utilise l'URL dynamique

        // Sélectionner l'ID de prix en fonction du mode Stripe et du nombre de jetons
        const priceIdMapping = {
            "10": process.env.STRIPE_MODE === "live" ? process.env.PRICE_ID_LIVE_10_TOKENS : process.env.PRICE_ID_TEST_10_TOKENS,
            "50": process.env.STRIPE_MODE === "live" ? process.env.PRICE_ID_LIVE_50_TOKONS : process.env.PRICE_ID_TEST_50_TOKENS,
            "100": process.env.STRIPE_MODE === "live" ? process.env.PRICE_ID_LIVE_100_TOKENS : process.env.PRICE_ID_TEST_100_TOKENS
        };

        const priceId = priceIdMapping[tokensAmount];
        if (!priceId) {
            return { error: "Montant de jetons invalide." };
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: email,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${BASE_URL}/confirmation-jetons.html?tokens=${tokensAmount}`,
            cancel_url: `${BASE_URL}/jetons.html`
        });

        return session;
    } catch (error) {
        console.error('❌ Erreur dans createTokenCheckoutSession :', error.message);
        throw new Error(error.message);
    }
}



module.exports = { createCheckoutSession, cancelSubscription, getUserSubscription, createTokenCheckoutSession };
