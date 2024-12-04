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
