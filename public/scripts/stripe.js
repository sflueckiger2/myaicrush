const stripeSecretKey = process.env.STRIPE_MODE === "live"
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST;

const stripe = require('stripe')(stripeSecretKey);

console.log(`🎯 Mode Stripe dans stripe.js : ${process.env.STRIPE_MODE.toUpperCase()}`);
console.log(`🔑 Clé API Stripe utilisée : ${stripeSecretKey.startsWith("sk_live") ? "LIVE" : "TEST"}`);



// Fonction pour créer une session de paiement Stripe
// ⚠️ 2e paramètre optionnel: customerEmail (si tu l'as côté backend)
async function createCheckoutSession(priceId, customerEmail) {
  console.log("createCheckoutSession appelé avec Price ID :", priceId);

  try {
    // ✅ On vérifie la vraie clé utilisée (stripeSecretKey), pas STRIPE_SECRET_KEY générique
    if (!stripeSecretKey) {
      console.error("Erreur : Clé API Stripe (stripeSecretKey) non définie");
      throw new Error("Clé API Stripe non définie");
    }

    const BASE_URL = process.env.BASE_URL || "http://localhost:3000"; // Utilise l'URL dynamique

    // ✅ On prépare les params Stripe
    const sessionParams = {
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],

      // ⚠️ SUPER IMPORTANT :
      // On met {CHECKOUT_SESSION_ID} pour pouvoir le récupérer dans confirmation.html
      success_url: `${BASE_URL}/confirmation.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/premium.html`,
    };

    // ✅ Si tu connais déjà l'email de l'utilisateur, on le passe à Stripe
    if (customerEmail) {
      const normalizedEmail = customerEmail.trim().toLowerCase();

      sessionParams.customer_email = normalizedEmail;

      // On met aussi dans les metadata (utile en debug / webhooks plus tard)
      sessionParams.metadata = {
        userEmail: normalizedEmail,
      };

      // Pour les abonnements, on peut aussi mettre dans subscription_data.metadata
      sessionParams.subscription_data = {
        metadata: {
          userEmail: normalizedEmail,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("Session Checkout créée avec succès :", {
      url: session.url,
      id: session.id,
      customer: session.customer,
      customer_email: session.customer_email,
    });

    return session;
  } catch (error) {
    console.error("Erreur dans createCheckoutSession :", error);
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
    console.log("Recherche de l'abonnement pour email :", email);

    const customers = await stripe.customers.search({
      query: `email:"${email}"`, // ✅ Stripe recommande les guillemets
    });

    if (!customers?.data?.length) {
      return null;
    }

    const customer = customers.data[0];

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
      expand: ["data.items.data.price"], // ✅ pour unit_amount + recurring
    });

    if (!subscriptions?.data?.length) {
      return null;
    }

    // ✅ Prend le plus récent (important)
    const subscription = subscriptions.data.sort((a, b) => b.created - a.created)[0];

    const price = subscription.items?.data?.[0]?.price;

    return {
  status: subscription.status,
  cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
  current_period_end: subscription.current_period_end || null,
  amount: price?.unit_amount != null ? price.unit_amount / 100 : null,
  interval: price?.recurring?.interval || null,
  interval_count: price?.recurring?.interval_count || 1
};

  } catch (error) {
    console.error("Erreur lors de la récupération de l'abonnement :", error.message);
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
            "50": process.env.STRIPE_MODE === "live" ? process.env.PRICE_ID_LIVE_50_TOKENS : process.env.PRICE_ID_TEST_50_TOKENS,
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
