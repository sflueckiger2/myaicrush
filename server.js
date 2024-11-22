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

// Route pour l'inscription
app.post('/api/signup', async (req, res) => {
    console.log('Data received from frontend:', req.body);

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Ajouter un nouvel utilisateur
        await users.insertOne({ email, password });
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route pour la connexion
app.post('/api/login', async (req, res) => {
    console.log('Login attempt:', req.body);

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        // Vérifier si l'utilisateur existe et si le mot de passe correspond
        const user = await users.findOne({ email, password });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Réponse avec les informations de l'utilisateur (sans le mot de passe)
        res.status(200).json({
            message: 'Login successful!',
            user: {
                email: user.email,
                // password: user.password, // Ne renvoie pas le mot de passe en production
            },
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route pour créer une session de paiement Stripe
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { priceId } = req.body; // Récupère l'ID du prix Stripe depuis le frontend
        if (!priceId) {
            return res.status(400).json({ message: 'Price ID is required' });
        }

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

        res.json({ url: session.url }); // Renvoie l'URL de la session Stripe
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ message: 'Failed to create checkout session' });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});