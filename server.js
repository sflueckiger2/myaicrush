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
        res.status(201).json({ email });
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
            },
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Route pour vérifier si un utilisateur est premium
app.post('/api/is-premium', async (req, res) => {
    console.log('Requête reçue pour vérifier le statut premium');
    const { email } = req.body; // On suppose que tu passes l'email de l'utilisateur dans la requête

    try {
        // Rechercher un client Stripe avec cet email
        const customers = await stripe.customers.search({
            query: email:'${email}',
        });

        if (customers.data.length === 0) {
            console.log('Aucun client trouvé pour cet email');
            return res.json({ isPremium: false });
        }

        // Vérifier les abonnements actifs du client
        const customer = customers.data[0];
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
        });

        const isPremium = subscriptions.data.length > 0; // Premium si au moins un abonnement actif
        console.log(Statut premium pour ${email} :, isPremium);

        res.json({ isPremium });
    } catch (error) {
        console.error('Erreur lors de la vérification du statut premium :', error.message);
        res.status(500).json({ message: 'Erreur lors de la vérification du statut premium' });
    }
});

// Route pour changer le mot de passe
app.post('/api/change-password', async (req, res) => {
    console.log('Password change request received:', req.body);

    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        // Vérifier si l'utilisateur existe et si le mot de passe actuel est correct
        const user = await users.findOne({ email, password: currentPassword });
        if (!user) {
            return res.status(401).json({ message: 'Invalid current password' });
        }

        // Mettre à jour le mot de passe
        await users.updateOne({ email }, { $set: { password: newPassword } });
        res.status(200).json({ message: 'Password changed successfully!' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

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

app.post('/api/cancel-subscription', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const result = await cancelSubscription(email); // Appel direct à la fonction Stripe
        res.status(200).json(result); // Retourne la réponse directement
    } catch (error) {
        res.status(500).json({ message: error.message }); // Retourne une erreur formatée
    }
});

// ROUTE POUR AFFICHER LES ABOS
  
// Import de la fonction pour récupérer les abonnements
const { getUserSubscription } = require('./public/scripts/stripe.js');




// Démarrer le serveur
app.listen(PORT, () => {
    console.log(Server is running on http://localhost:${PORT});
});