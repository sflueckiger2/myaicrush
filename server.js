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

// Route pour envoyer un email de réinitialisation
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const database = client.db('MyAICrush');
    const users = database.collection('users');

    // Vérifie si l'utilisateur existe
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Génère un token unique pour la réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiration = new Date(Date.now() + 3600000); // 1 heure

    // Sauvegarde le token et son expiration dans la base
    await users.updateOne(
      { email },
      { $set: { resetToken, resetTokenExpiration } }
    );

    // Envoie l'email avec le lien de réinitialisation
    const resetUrl = http://localhost:3000/reset-password.html?token=${resetToken};
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      text: You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.,
    });

    res.status(200).json({ message: 'Reset link sent to your email.' });
  } catch (error) {
    console.error('Error sending reset email:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


//route pour mdp réinitialiser

app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
  
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
  
    try {
      const database = client.db('MyAICrush');
      const users = database.collection('users');
  
      const user = await users.findOne({
        resetToken: token,
        resetTokenExpiration: { $gte: new Date() },
      });
  
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
      }
  
      // Mettre à jour le mot de passe et supprimer le token
      await users.updateOne(
        { resetToken: token },
        { $set: { password: newPassword }, $unset: { resetToken: "", resetTokenExpiration: "" } }
      );
  
      res.status(200).json({ message: 'Password successfully reset!' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
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