import { characters } from './data.js';

export function openProfileModal(characterName) {
  const character = characters.find(char => char.name === characterName);

  if (character) {
    document.getElementById('profile-image-full').src = character.photo;
    document.getElementById('profile-name').textContent = character.name;
    document.getElementById('profile-height').textContent = character.height;
    document.getElementById('profile-measurements').textContent = character.measurements;
    document.getElementById('profile-ethnicity').textContent = character.ethnicity;
    document.getElementById('profile-interests').textContent = character.interests.join(', ');

    document.getElementById('profile-modal').style.display = 'flex';
  } else {
    console.error('Personnage non trouvé dans characters.json');
  }
}

export function closeProfileModal() {
  document.getElementById('profile-modal').style.display = 'none';
}
