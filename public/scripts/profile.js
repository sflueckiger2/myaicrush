import { characters } from './data.js';


// Vérification du statut premium et affichage de la section "Jetons"
// Vérification du statut premium (MongoDB: explodelyPremium uniquement)
async function checkPremiumStatus() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user?.email) return;

  try {
    const response = await fetch("/api/is-premium-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email })
    });

    const data = await response.json();
    const statusEl = document.getElementById("subscription-status");
    if (!statusEl) return;

    if (data.isPremium === true) {
      statusEl.innerHTML = `
        <div class="sub-ok">
          Premium ✅
        </div>
      `;
    } else {
      statusEl.innerHTML = `
        <div class="sub-off">
  <p style="margin-bottom: 12px;">
    Your Premium is not active, expired, or pending renewal.
  </p>

  <div class="lifetime-box">
    💎 Premium — Lifetime Access<br>
    <span class="lifetime-price">$49 — one-time payment</span>
  </div>

  <a href="https://explodely.com/p/887584369"
     target="_blank"
     class="premium-cta-btn">
     🚀 Activate Premium
  </a>
</div>
      `;
    }
  } catch (error) {
    console.error("❌ Erreur vérification premium DB :", error);
  }
}





// Fonction pour ouvrir la modal de profil du personnage
export function openProfileModal(characterName) {
  const character = characters.find(char => char.name === characterName);

  if (character) {
    const profileModal = document.getElementById('profile-modal');
    let profileImage = document.getElementById('profile-image-full');

    const profileName = document.getElementById('profile-name');
    const profileHeight = document.getElementById('profile-height');
    const profileMeasurements = document.getElementById('profile-measurements');
    const profileEthnicity = document.getElementById('profile-ethnicity');
    const profileInterests = document.getElementById('profile-interests');

    if (profileModal && profileImage && profileName && profileHeight && profileMeasurements && profileEthnicity && profileInterests) {
      // Remplacer l'image par une vidéo si c'est un .mp4
if (character.photo.endsWith('.mp4')) {
  const video = document.createElement('video');
  video.src = character.photo;
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.style.width = '100%';
  video.style.borderRadius = '12px';

  const imageContainer = document.getElementById('profile-image-full').parentNode;
  const oldImg = document.getElementById('profile-image-full');
  if (oldImg) oldImg.remove();
  video.id = 'profile-image-full'; // pour garder la même logique
  imageContainer.insertBefore(video, imageContainer.firstChild);
} else {
  profileImage.src = character.photo;
}

      profileName.textContent = character.name;
      profileHeight.textContent = character.height;
      profileMeasurements.innerHTML = character.measurements.replace(/\n/g, '<br>');
     profileEthnicity.innerHTML = character.ethnicity.replace(/\n/g, '<br>');
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

      // Fonction pour récupérer et afficher les jetons
async function displayUserTokens() {
  try {
      const user = JSON.parse(localStorage.getItem('user'));

      if (!user || !user.email) {
          console.log("Utilisateur non connecté.");
          return;
      }

      const response = await fetch('/api/get-user-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Impossible de récupérer les jetons.");
      }

      const data = await response.json();
      const tokenElement = document.getElementById('user-tokens');
      if (tokenElement) {
          tokenElement.textContent = `${data.tokens} Jetons disponibles`;
      }
  } catch (error) {
      console.error("❌ Erreur lors de la récupération des jetons :", error);
      const tokenElement = document.getElementById('user-tokens');
      if (tokenElement) {
          tokenElement.textContent = "Erreur lors du chargement des jetons.";
      }
  }
}

// Appelle la fonction après chargement du profil
displayUserTokens();
// Appelle la fonction après chargement du profil
checkPremiumStatus();


} else {
  if (profileInfo) profileInfo.classList.add('hidden');

  // Par défaut : afficher inscription, cacher connexion
  if (signinContainer) signinContainer.classList.add('hidden');
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
          alert("Le nouveau mot de passe et la confirmation ne correspondent pas !");
          return;
        }

        try {
          const response = await fetchRequest('/api/change-password', {
            email: user.email,
            currentPassword,
            newPassword,
          });

          if (response.ok) {
            alert("Mot de passe changé avec succès !");
            changePasswordForm.reset();
          } else {
            const errorData = await response.json();
            alert(errorData.message || 'Le changement de mot de passe a échoué');
          }
        } catch (error) {
          console.error('Error changing password:', error);
          alert('Erreur. Merci de réessayer.');
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
  signupContainer.classList.add('hidden');     // cache inscription
  signinContainer.classList.remove('hidden');  // montre connexion
});

showSignupLink.addEventListener('click', (e) => {
  e.preventDefault();
  console.log('Switching to Sign Up form');
  signinContainer.classList.add('hidden');     // cache connexion
  signupContainer.classList.remove('hidden');  // montre inscription
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

          // 🚀 Vérifier si c'est un nouvel utilisateur
          if (data.isNewUser) {
            window.location.href = 'index.html'; // Page de confirmation
          } else {
            window.location.href = 'index.html'; // Page d'accueil normale
          }

        } else {
          const errorData = await response.json();
          alert(errorData.message || 'La connexion a échoué');
        }
      } catch (error) {
        console.error('Error during signup:', error);
        alert('Erreur. Merci de réessayer.');
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
          alert(errorData.message || 'La connexion a échoué');
        }
      } catch (error) {
        console.error('Error during login:', error);
        alert('Erreur. Merci de réessayer.');
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




	