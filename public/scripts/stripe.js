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

// Fonction pour gérer le webhook Stripe et ajouter des jetons après paiement réussi
async function handleStripeWebhook(req, res) {
    console.log("📡 Webhook Stripe reçu !");
    const sig = req.headers['stripe-signature'];

    if (!sig) {
        console.error("❌ Signature Stripe manquante !");
        return res.status(400).send("Webhook Error: Signature missing");
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log("✅ Webhook Stripe validé !");
    } catch (err) {
        console.error("❌ Erreur lors de la validation du webhook :", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const email = session.customer_email;

        if (!email) {
            console.error("❌ Aucune adresse email trouvée dans la session !");
            return res.status(400).send("Aucun email détecté");
        }

        console.log(`💰 Paiement confirmé pour ${email}`);

        try {
            // 🔥 Récupérer la session complète avec les `line_items`
            const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, { expand: ["line_items"] });

            if (!sessionWithLineItems.line_items || sessionWithLineItems.line_items.data.length === 0) {
                console.error("❌ Impossible de récupérer les line_items !");
                return res.status(400).send("Données line_items manquantes");
            }

            // 🔥 Récupérer l'ID du prix depuis les `line_items`
            const priceId = sessionWithLineItems.line_items.data[0].price.id;
            const tokensPurchased = Object.entries(priceIdMapping).find(([key, value]) => value === priceId)?.[0];

            if (!tokensPurchased) {
                console.error("❌ Impossible de déterminer le nombre de jetons achetés !");
                return res.status(400).send("Jetons non détectés");
            }

            console.log(`🎟 Créditer ${tokensPurchased} jetons à ${email}`);

            // 🔥 Mise à jour de l'utilisateur en BDD
            const database = client.db('MyAICrush');
            const users = database.collection('users');

            const updateResult = await users.updateOne(
                { email },
                { $inc: { creditsPurchased: parseInt(tokensPurchased, 10) } }
            );

            if (updateResult.modifiedCount > 0) {
                console.log(`✅ ${tokensPurchased} jetons ajoutés pour ${email}`);
            } else {
                console.error("❌ Aucun utilisateur mis à jour. Vérifie si l'email est bien enregistré dans la DB.");
            }

        } catch (error) {
            console.error("❌ Erreur lors de la récupération des line_items ou mise à jour en BDD :", error);
            return res.status(500).send("Erreur interne lors de l'ajout des crédits");
        }
    }

    res.json({ received: true });
}

module.exports = { createCheckoutSession, cancelSubscription, getUserSubscription, createTokenCheckoutSession, handleStripeWebhook };
