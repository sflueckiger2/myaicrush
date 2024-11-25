const express = require('express');
require('dotenv').config();

const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Assurez-vous que STRIPE_SECRET_KEY est défini dans le fichier .env

const app = express();
const PORT = 4000;

// MongoDB connection string
const uri = "mongodb+srv://admin:Py%40965_Xl@cluster0.gn9ue.mongodb.net/MyAICrush?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri);

app.use(cors({
    origin: 'http://localhost:3000', // Autoriser les requêtes du frontend
    methods: ['GET', 'POST'], // Autoriser uniquement GET et POST
    allowedHeaders: ['Content-Type'], // Autoriser le header Content-Type
}));

app.use(bodyParser.json()); // Middleware pour parser le JSON

// Fonction pour se connecter à MongoDB
async function connectToDB() {
    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas!');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); // Quitte l'application si la connexion échoue
    }
}

connectToDB();

// Route pour créer une session de paiement Stripe
app.post('/api/create-checkout-session', async (req, res) => {
    console.log('Requête reçue sur /api/create-checkout-session'); // Log pour vérifier l’appel
    console.log('Corps de la requête :', req.body); // Affiche le corps de la requête

    try {
        const { priceId } = req.body; // Récupère l'ID du prix Stripe depuis le frontend
        console.log('Price ID reçu :', priceId); // Log le Price ID pour vérification

        if (!priceId) {
            console.error('Erreur : Price ID manquant');
            return res.status(400).json({ message: 'Price ID is required' });
        }

        // Vérifie que la clé API Stripe est bien chargée
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('Erreur : Clé API Stripe non définie');
            return res.status(500).json({ message: 'Stripe API key not configured' });
        }
        console.log('Clé API Stripe utilisée :', process.env.STRIPE_SECRET_KEY);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price: priceId, // Utilise l'ID de prix fourni par Stripe
                    quantity: 1,
                },
            ],
            success_url: 'http://localhost:3000/success',
            cancel_url: 'http://localhost:3000/cancel',
        });

        console.log('Session Checkout créée avec succès :', session.url); // Log l'URL de la session
        res.json({ url: session.url }); // Renvoie l'URL de la session Stripe
    } catch (error) {
        console.error('Erreur lors de la création de la session Stripe :', error.message); // Log l’erreur
        res.status(500).json({ message: 'Failed to create checkout session' });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
