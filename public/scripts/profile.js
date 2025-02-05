import { characters } from './data.js';

// Fonction pour ouvrir la modal de profil du personnage
export function openProfileModal(characterName) {
  const character = characters.find(char => char.name === characterName);

  if (character) {
    const profileModal = document.getElementById('profile-modal');
    const profileImage = document.getElementById('profile-image-full');
    const profileName = document.getElementById('profile-name');
    const profileHeight = document.getElementById('profile-height');
    const profileMeasurements = document.getElementById('profile-measurements');
    const profileEthnicity = document.getElementById('profile-ethnicity');
    const profileInterests = document.getElementById('profile-interests');

    if (profileModal && profileImage && profileName && profileHeight && profileMeasurements && profileEthnicity && profileInterests) {
      profileImage.src = character.photo;
      profileName.textContent = character.name;
      profileHeight.textContent = character.height;
      profileMeasurements.textContent = character.measurements;
      profileEthnicity.textContent = character.ethnicity;
      profileInterests.textContent = character.interests.join(', ');

      profileModal.style.display = 'flex';
    } else {
      console.error('Un ou plusieurs éléments DOM nécessaires sont introuvables.');
    }
  } else {
    console.error('Personnage non trouvé dans characters.json');
  }
}

// Fonction pour fermer la modal de profil du personnage
export function closeProfileModal() {
  const profileModal = document.getElementById('profile-modal');
  if (profileModal) {
    profileModal.style.display = 'none';
  } else {
    console.error('Élément modal introuvable.');
  }
}

// Gérer l'état de connexion et le formulaire sur profile.html uniquement
if (window.location.pathname.includes('profile.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    const profileInfo = document.getElementById('profile-info');
    const loginForm = document.getElementById('login-form');
    const signinContainer = document.getElementById('signin-container');
    const signupContainer = document.getElementById('signup-container');
    const signupForm = document.getElementById('signup-form');
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const changePasswordForm = document.getElementById('change-password-form');

    // Vérifier si l'utilisateur est connecté
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
      if (loginForm) loginForm.classList.add('hidden');
      if (signupContainer) signupContainer.classList.add('hidden');
      if (profileInfo) profileInfo.classList.remove('hidden');
      if (userEmailSpan) userEmailSpan.textContent = user.email;
    } else {
      if (profileInfo) profileInfo.classList.add('hidden');
      if (loginForm) loginForm.classList.remove('hidden');
      if (signupContainer) signupContainer.classList.remove('hidden');
    }

    // Gérer la déconnexion
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        localStorage.removeItem('user');
        location.reload();
      });
    }

    // Gérer la soumission du formulaire de changement de mot de passe
    if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
          alert("New password and confirmation do not match!");
          return;
        }

        try {
          const response = await fetchRequest('/api/change-password', {
            email: user.email,
            currentPassword,
            newPassword,
          });

          if (response.ok) {
            alert("Password successfully changed!");
            changePasswordForm.reset();
          } else {
            const errorData = await response.json();
            alert(errorData.message || 'Failed to change password.');
          }
        } catch (error) {
          console.error('Error changing password:', error);
          alert('An error occurred. Please try again.');
        }
      });
    }
  });
}

// Gérer la navigation entre "Sign In" et "Sign Up" sur toutes les pages
document.addEventListener('DOMContentLoaded', () => {
  const showSigninLink = document.getElementById('show-signin');
  const showSignupLink = document.getElementById('show-signup');
  const signinContainer = document.getElementById('signin-container');
  const signupContainer = document.getElementById('signup-container');

  if (showSigninLink && signinContainer && signupContainer) {
    showSigninLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Switching to Sign In form');
      signupContainer.style.display = 'none';  // On cache l'inscription
      signinContainer.style.display = 'block'; // On montre la connexion
    });
  }

  if (showSignupLink && signinContainer && signupContainer) {
    showSignupLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Switching to Sign Up form');
      signinContainer.style.display = 'none';  // On cache la connexion
      signupContainer.style.display = 'block'; // On montre l'inscription
    });
  }
});


// Gérer la soumission du formulaire d'inscription sur toutes les pages
document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form');

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;

      try {
        const response = await fetchRequest('/api/signup', { email, password });

        if (response.ok) {
          const data = await response.json();
          signupForm.reset(); // Réinitialise le formulaire
          localStorage.setItem('user', JSON.stringify({ email })); // Stocker l'utilisateur
          window.location.href = 'index.html'; // Rediriger vers la page principale
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Signup failed');
        }
      } catch (error) {
        console.error('Error during signup:', error);
        alert('An error occurred. Please try again.');
      }
    });
  }
});

// Gérer la soumission du formulaire de connexion sur toutes les pages
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        const response = await fetchRequest('/api/login', { email, password });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('user', JSON.stringify(data.user)); // Stocker l'utilisateur
          window.location.href = 'index.html'; // Rediriger vers la page principale
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Login failed');
        }
      } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred. Please try again.');
      }
    });
  }
});

// Fonction générique pour effectuer des requêtes fetch
async function fetchRequest(url, body) {
  const BASE_URL = window.location.origin;
  return await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
