const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017'; // URI MongoDB Atlas ou localhost
const dbName = process.env.DB_NAME || 'MyAICrush'; // Nom de la base de données

let db; // Variable pour stocker l'instance de la base de données

// Fonction pour se connecter à MongoDB
async function connectToDb() {
  if (!db) {
    try {
      const client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true, // Recommandé pour MongoDB Atlas
      });
      await client.connect();
      db = client.db(dbName);
      console.log(`Connecté à la base de données : ${dbName}`);
    } catch (error) {
      console.error('Erreur lors de la connexion à MongoDB :', error);
      throw error;
    }
  }
  return db;
}

// Fonction pour récupérer l'instance de la base de données
function getDb() {
  if (!db) {
    throw new Error('Base de données non connectée. Appelez connectToDb() d\'abord.');
  }
  return db;
}

module.exports = { connectToDb, getDb };
