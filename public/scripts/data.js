import { generateChatOptions } from './ui.js';


export let characters = []; // Déclare characters comme une variable exportable

export function loadCharacters() {
  fetch('/characters.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP : ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      characters = data; // Met à jour la variable characters
      generateChatOptions(data);
    })
    .catch(error => {
      console.error('Erreur lors du chargement des personnages :', error);
    });
}

  