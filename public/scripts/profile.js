import { characters } from './data.js';

// Fonction pour ouvrir la modal de profil du personnage
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

// Fonction pour fermer la modal de profil du personnage
export function closeProfileModal() {
  document.getElementById('profile-modal').style.display = 'none';
}

// Gérer l'état de connexion pour la page profile.html
document.addEventListener('DOMContentLoaded', () => {
  const profileInfo = document.getElementById('profile-info');
  const loginForm = document.getElementById('login-form');
  const userEmailSpan = document.getElementById('user-email');
  const userPasswordSpan = document.getElementById('user-password');
  const logoutButton = document.getElementById('logout-button');

  // Vérifier si l'utilisateur est connecté
  const user = JSON.parse(localStorage.getItem('user'));

  if (user) {
    // Si l'utilisateur est connecté
    loginForm.classList.add('hidden');
    profileInfo.classList.remove('hidden');
    userEmailSpan.textContent = user.email;
    userPasswordSpan.textContent = user.password;
  } else {
    // Si l'utilisateur n'est pas connecté
    profileInfo.classList.add('hidden');
    loginForm.classList.remove('hidden');
  }

  // Gérer la soumission du formulaire de connexion
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('http://localhost:4000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        // Enregistrer les informations de l'utilisateur dans localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        location.reload(); // Recharger la page pour afficher les infos du profil
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Login failed');
      }
    } catch (error) {
      console.error('Error during login:', error);
      alert('An error occurred. Please try again.');
    }
  });

  // Gérer la déconnexion
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('user'); // Supprimer les infos de l'utilisateur
    location.reload(); // Recharger la page pour afficher le formulaire de connexion
  });
});
