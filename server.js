const express = require('express');
require('dotenv').config();

const app = express();

// Port dynamique pour Render ou fallback à 4000
const PORT = process.env.PORT || 4000;

// Route de test simple
app.get('/api/test', (req, res) => {
    console.log('Route /api/test appelée');
    res.status(200).json({ message: 'API is working on Render!' });
});

// Middleware de log pour s'assurer que les requêtes passent
app.use((req, res, next) => {
    console.log(`Requête reçue : ${req.method} ${req.url}`);
    next();
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
