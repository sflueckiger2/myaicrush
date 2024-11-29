const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Charge la clé secrète depuis .env

// Fonction pour créer une session de paiement Stripe
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
            success_url: 'http://localhost:3000/',
            cancel_url: 'http://localhost:3000/premium.html',
        });

        console.log('Session Checkout créée avec succès :', session.url); // Log l'URL de la session
        return session;
    } catch (error) {
        console.error('Erreur dans createCheckoutSession :', error.message); // Log des erreurs
        throw new Error(error.message);
    }
}

// Fonction pour annuler un abonnement Stripe
async function cancelSubscription(email) {
    try {
        console.log('Annulation d\'abonnement pour email :', email);

        // Rechercher le client Stripe par email
        const customers = await stripe.customers.search({
            query: `email:'${email}'`,
        });

        if (customers.data.length === 0) {
            console.error('Client non trouvé pour cet email');
            throw new Error('Client non trouvé');
        }

        const customer = customers.data[0];

        // Récupérer les abonnements actifs
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
        });

        if (subscriptions.data.length === 0) {
            console.error('Aucun abonnement actif trouvé pour ce client');
            throw new Error('Aucun abonnement actif trouvé');
        }

        const subscriptionId = subscriptions.data[0].id;

        // Marquer l'abonnement pour annulation à la fin de la période actuelle
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

module.exports = { createCheckoutSession, cancelSubscription };
