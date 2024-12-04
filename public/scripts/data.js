import { generateChatOptions } from './ui.js';

export let characters = []; // Déclare characters comme une variable exportable

// Fonction pour charger les personnages depuis le serveur
export async function loadCharacters() {
  try {
    const response = await fetch('/characters.json'); // Récupère le fichier JSON
    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status}`);
    }
    const data = await response.json(); // Convertit la réponse en JSON
    characters = data; // Met à jour la variable globale characters
    generateChatOptions(data); // Appelle generateChatOptions avec les personnages
    return data; // Retourne les données chargées
  } catch (error) {
    console.error('Erreur lors du chargement des personnages :', error);
    return []; // Retourne un tableau vide en cas d'erreur
  }
}
// Fonction pour changer de personnage
export async function setCharacter(name) {
  try {
    const response = await fetch('/setCharacter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }), // Le nom du personnage à envoyer
    });

    const data = await response.json();
    if (response.ok) {
      console.log('Personnage actif mis à jour côté serveur :', data.message);
    } else {
      console.error('Erreur serveur :', data.message);
    }
  } catch (error) {
    console.error('Erreur lors de l’appel à /setCharacter :', error);
  }
}

// fonction pour réinitialiser le niveau UTILISATEUR avec le BACK BUTTON
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
