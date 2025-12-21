import { generateChatOptions } from './ui.js';

export let characters = [];

/* =========================
   CDN CONFIG
========================= */

const CDN_BASE =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? '' // LOCAL → fichiers locaux
    : 'https://img.myaicrush.ai';

/**
 * Résout un chemin média AVANT insertion DOM
 * → empêche toute requête Render en prod
 */
function resolveMedia(path) {
  if (!path) return path;

  // Déjà absolu
  if (path.startsWith('http')) return path;

  // Chemin images relatif
  if (path.startsWith('images/')) {
    return CDN_BASE + '/' + path;
  }

  return path;
}

/**
 * Applique la résolution CDN à UN personnage
 */
function resolveCharacterMedia(character) {
  character.photo = resolveMedia(character.photo);
  character.backgroundPhoto = resolveMedia(character.backgroundPhoto);
  character.introVideo = resolveMedia(character.introVideo);

  if (character.images) {
    Object.keys(character.images).forEach(key => {
      character.images[key] = resolveMedia(character.images[key]);
    });
  }

  if (character.privateContents) {
    character.privateContents.forEach(content => {
      content.preview = resolveMedia(content.preview);
      content.folder = resolveMedia(content.folder);
    });
  }
}

/* =========================
   LOAD CHARACTERS
========================= */

export async function loadCharacters() {
  try {
    const response = await fetch(`/characters.json?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status}`);
    }

    const data = await response.json();

    // 🔥 RÉSOLUTION CDN AVANT TOUT
    data.forEach(resolveCharacterMedia);

    // Mise à jour globale
    characters = data;

    // UI
    generateChatOptions(characters);

    // Préload SAFE
    preloadImages(characters);

    return characters;
  } catch (error) {
    console.error('❌ Erreur chargement personnages :', error);
    return [];
  }
}

/* =========================
   SET ACTIVE CHARACTER
========================= */

export async function setCharacter(name) {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.email) {
      console.error('❌ Utilisateur non connecté');
      return;
    }

    const response = await fetch('/setCharacter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email: user.email
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Personnage actif mis à jour :', data.message);
      localStorage.setItem('activeCharacter', JSON.stringify({ name }));
    } else {
      console.error('❌ Erreur serveur :', data.message);
    }
  } catch (error) {
    console.error('❌ Erreur /setCharacter :', error);
  }
}

/* =========================
   RESET USER LEVEL
========================= */

export function resetUserLevel() {
  fetch('/resetUserLevel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => {
      if (res.ok) {
        console.log('🔄 Niveau utilisateur réinitialisé');
      }
    })
    .catch(err => {
      console.error('❌ Reset level error:', err);
    });
}

/* =========================
   SAFE PRELOAD (NO RENDER HIT)
========================= */

function preloadImages(characters) {
  // ❌ Pas de preload en local (inutile + lent)
  if (!CDN_BASE) return;

  characters.forEach(character => {
    if (character.photo && !character.photo.endsWith('.mp4')) {
      const img = new Image();
      img.src = character.photo; // déjà CDN
    }
  });
}
