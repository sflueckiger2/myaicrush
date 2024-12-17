const express = require('express');
require('dotenv').config();

const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Assurez-vous que STRIPE_SECRET_KEY est défini dans le fichier .env

const app = express();
const PORT = 4000;



// Route de test pour vérifier que le serveur fonctionne
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'API is working on Render!' });
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
