const express = require('express');
require('dotenv').config();

const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');


const app = express();
const PORT = process.env.PORT || 4000;


// MongoDB connection string
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

app.use(express.static('public')); // Servir les fichiers du dossier public


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








//route pour mdp oublié email 

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Transporteur Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Ton email
    pass: process.env.EMAIL_PASS, // Ton mot de passe ou app password
  },
});





  // route pour la desabo premium

  const { cancelSubscription, createCheckoutSession } = require('./public/scripts/stripe.js'); // Import de la logique Stripe



// ROUTE POUR AFFICHER LES ABOS
  
// Import de la fonction pour récupérer les abonnements
const { getUserSubscription } = require('./public/scripts/stripe.js');




// Démarrer le serveur
app.listen(PORT, () => {
    console.log(Server is running on http://localhost:${PORT});
});