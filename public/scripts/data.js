import { generateChatOptions } from './ui.js';

export let characters = []; // Déclare characters comme une variable exportable

// Fonction pour charger les personnages depuis le serveur
export async function loadCharacters() {
  try {
    const response = await fetch(`/characters.json?t=${new Date().getTime()}`);

    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status}`);
    }
    const data = await response.json(); // Convertit la réponse en JSON
    characters = data; // Met à jour la variable globale characters

    // Afficher immédiatement les options du chat
    generateChatOptions(data);

    // Précharger les images
    preloadImages(data);

    return data;
  } catch (error) {
    console.error('Erreur lors du chargement des personnages :', error);
    return []; // Retourne un tableau vide en cas d'erreur
  }
}

// Fonction pour changer de personnage avec gestion multi-utilisateurs
export async function setCharacter(name) {
  try {
    const user = JSON.parse(localStorage.getItem('user')); // 🔥 Récupère l'utilisateur connecté
    if (!user || !user.email) {
      console.error("❌ Erreur : utilisateur non connecté !");
      return;
    }

    const response = await fetch('/setCharacter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        email: user.email // 🔥 Envoi de l'email pour lier le personnage
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log('✅ Personnage actif mis à jour côté serveur :', data.message);
      
      // 🔥 Stocker le personnage dans localStorage pour éviter les erreurs après un refresh
      localStorage.setItem('activeCharacter', JSON.stringify({ name }));
    } else {
      console.error('❌ Erreur serveur :', data.message);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l’appel à /setCharacter :', error);
  }
}





// Fonction pour réinitialiser le niveau UTILISATEUR avec le BACK BUTTON
export function resetUserLevel() {
  fetch('/resetUserLevel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (response.ok) {
        console.log('Niveau utilisateur réinitialisé à 1.0');
      }
    })
    .catch((error) => {
      console.error('Erreur lors de la réinitialisation du niveau utilisateur :', error);
    });
}

// ✅ Fonction pour **précharger** toutes les images des personnages
function preloadImages(characters) {
  characters.forEach(character => {
    const img = new Image();
    img.src = character.photo; // Charge l'image immédiatement
    img.loading = "eager"; // Demande un chargement prioritaire
  });
}
