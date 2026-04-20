import { characters } from './data.js';




async function tryCancelSubscription(email, orderId = null) {
  try {
    const r = await fetch("/api/cancel-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, orderId })
    });
    return await r.json();
  } catch (err) {
    return { success: false, error: "server_error" };
  }
}

async function cancelWithFallback(primaryEmail) {
  const result = await tryCancelSubscription(primaryEmail);

  if (result.success) {
    window.location.href = "cancellation.html";
    return;
  }

  // Ouvre la modal pour TOUS les cas d'erreur sauf erreur serveur pure
  if (result.error !== "explodely_error" && result.error !== "server_error") {
    openCancelModal();
  } else {
    const _l = navigator.language || "";
    alert((_l.startsWith("fr") ? "Erreur : " : _l.startsWith("de") ? "Fehler: " : "Error: ") + (result.message || (_l.startsWith("fr") ? "Erreur inconnue" : _l.startsWith("de") ? "Unbekannter Fehler" : "Unknown error")));
  }
}

function openCancelModal() {
  document.getElementById("cancel-modal")?.remove();

  const modal = document.createElement("div");
  modal.id = "cancel-modal";
  modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.75);
    display:flex; align-items:center; justify-content:center; z-index:9999;
  `;
  modal.innerHTML = `
    <div style="background:#1a1a2e; border:1px solid rgba(255,255,255,0.1); border-radius:12px;
                padding:24px; max-width:400px; width:90%; text-align:center;">
      <h3 style="color:#f1f1f1; margin-bottom:10px;">We couldn't find your subscription</h3>
      <p style="font-size:0.85rem; color:#9ca3af; margin-bottom:16px;">
        Enter the email address you used to purchase, or your order number (found in your confirmation email).
      </p>
      <input id="modal-email-input" type="text" placeholder="Purchase email"
        style="width:100%; padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05); color:#f1f1f1; margin-bottom:10px;
               font-size:0.9rem; box-sizing:border-box;" />
      <input id="modal-orderid-input" type="text" placeholder="Order number (optional)"
        style="width:100%; padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05); color:#f1f1f1; margin-bottom:10px;
               font-size:0.9rem; box-sizing:border-box;" />
      <p id="modal-error" style="color:#f87171; font-size:0.8rem; min-height:18px; margin-bottom:10px;"></p>
      <div style="display:flex; gap:10px; justify-content:center;">
        <button id="modal-confirm-btn" style="padding:10px 16px; border-radius:8px; cursor:pointer;
          background:rgba(220,38,38,0.15); border:1px solid rgba(220,38,38,0.4); color:#f87171;">
          <i class="fas fa-times-circle"></i> Cancel subscription
        </button>
        <button id="modal-close-btn" style="padding:10px 16px; border-radius:8px; cursor:pointer;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#9ca3af;">
          Back
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("modal-close-btn").addEventListener("click", () => modal.remove());

  document.getElementById("modal-confirm-btn").addEventListener("click", async () => {
    const inputEmail = document.getElementById("modal-email-input").value.trim().toLowerCase();
    const inputOrderId = document.getElementById("modal-orderid-input").value.trim();
    const errorEl = document.getElementById("modal-error");

    if (!inputEmail && !inputOrderId) {
      errorEl.textContent = "Please enter your purchase email or order number.";
      return;
    }

    errorEl.textContent = "";
    document.getElementById("cancel-loader-overlay")?.classList.remove("hidden");

    const result = await tryCancelSubscription(inputEmail, inputOrderId || null);

    document.getElementById("cancel-loader-overlay")?.classList.add("hidden");

    if (result.success) {
      modal.remove();
      window.location.href = "cancellation.html";
    } else {
      errorEl.textContent = "Could not find a subscription with this information. Please check and try again.";
    }
  });
}

async function checkPremiumStatus() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user?.email) return;

  try {
    const response = await fetch("/api/is-premium", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email })
    });

    const data = await response.json();
    const statusEl = document.getElementById("subscription-status");
    if (!statusEl) return;

    if (data.isPremium === true) {
      let expiryHtml = "";
      let cancelledBanner = "";
      let isCancelled = false;
      let expiryFormatted = "";

      try {
        const userRes = await fetch("/api/get-user-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email })
        });
        const userData = await userRes.json();

        if (userData.premiumExpiresAt) {
          const date = new Date(userData.premiumExpiresAt);
          const lang = navigator.language || "en";
          const locale = lang.startsWith("fr") ? "fr-FR" : lang.startsWith("de") ? "de-DE" : "en-US";
          expiryFormatted = date.toLocaleDateString(locale, {
            year: "numeric", month: "long", day: "numeric"
          });
          const _el = navigator.language || "";
          let accessLabel = "Access until:";
          if (_el.startsWith("fr")) accessLabel = "Accès jusqu'au :";
          else if (_el.startsWith("de")) accessLabel = "Zugang bis:";
          expiryHtml = `<p style="color:#9ca3af; font-size:0.85rem; margin-top:8px;">${accessLabel} ${expiryFormatted}</p>`;
        }

        if (userData.premiumCancelledAt) {
          isCancelled = true;
          const _l = navigator.language || "";
          let bannerText = `Your subscription has been cancelled. You keep premium access until <strong style="color:#f472b6;">${expiryFormatted}</strong>.`;
          if (_l.startsWith("fr")) {
            bannerText = `Ton abonnement a été annulé. Tu conserves l'accès premium jusqu'au <strong style="color:#f472b6;">${expiryFormatted}</strong>.`;
          } else if (_l.startsWith("de")) {
            bannerText = `Dein Abo wurde gekündigt. Du behältst den Premium-Zugang bis zum <strong style="color:#f472b6;">${expiryFormatted}</strong>.`;
          }
          cancelledBanner = `
            <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:10px; padding:14px 18px; margin-bottom:14px;">
              <p style="color:#fbbf24; font-size:0.9rem; margin:0; line-height:1.5;">
                ${bannerText}
              </p>
            </div>
          `;
        }
      } catch (e) {}

      const _cl = navigator.language || "";
      let cancelLabel = "Cancel subscription";
      if (_cl.startsWith("fr")) cancelLabel = "Annuler mon abonnement";
      else if (_cl.startsWith("de")) cancelLabel = "Abo kündigen";

      const cancelBtnHtml = isCancelled ? "" : `
        <button id="cancel-sub-btn" style="display:inline-block; margin-top:12px; font-size:0.8rem; color:#6b7280; text-decoration:underline; background:none; border:none; cursor:pointer;">
          ${cancelLabel}
        </button>
      `;

      statusEl.innerHTML = `
        <div class="sub-ok">
          ${cancelledBanner}
          Premium ✅
          ${expiryHtml}
          ${cancelBtnHtml}
        </div>
      `;

      const bonusInfo = document.getElementById("bonus-tokens-info");
      if (bonusInfo) bonusInfo.style.display = "block";

      if (!isCancelled) {
        document.getElementById("cancel-sub-btn")?.addEventListener("click", () => {
          const modal = document.getElementById("cancel-warning-modal");
          if (!modal) return;

          const dateEl = document.getElementById("cancel-modal-date");
          if (dateEl) dateEl.textContent = expiryFormatted || "—";

          modal.style.display = "flex";
        });
      }

    } else {
      statusEl.innerHTML = `
        <div class="sub-off">
  <p style="margin-bottom: 12px;">
    Your Premium is not active, expired, or pending renewal.
  </p>
  <div class="lifetime-box">
    💎 Premium — Monthly Access<br>
    <span class="lifetime-price">$29/month</span>
  </div>
  <a href="https://myaicrush.ai/premium.html"
     target="_blank"
     class="premium-cta-btn">
     🚀 Activate Premium
  </a>
</div>
      `;
    }
  } catch (error) {
    console.error("❌ Erreur vérification premium :", error);
  }
}

function setupCancelModal() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user?.email) return;

  const modal = document.getElementById("cancel-warning-modal");
  if (!modal) return;

  document.getElementById("cancel-modal-keep")?.addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  document.getElementById("cancel-modal-confirm")?.addEventListener("click", async () => {
    modal.style.display = "none";
    document.getElementById("cancel-loader-overlay")?.classList.remove("hidden");
    await cancelWithFallback(user.email);
    document.getElementById("cancel-loader-overlay")?.classList.add("hidden");
  });
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

      if (data.pendingBonus) {
          showBonusPopup(data.tokens);
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
setupCancelModal();


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

function showBonusPopup(totalTokens) {
  const isFr = (navigator.language || "").startsWith("fr");
  const isDe = (navigator.language || "").startsWith("de");
  const isEs = (navigator.language || "").startsWith("es");

  const title = isFr ? "30 jetons offerts !" : isDe ? "30 Gratis-Tokens!" : isEs ? "30 tokens gratis!" : "30 Free Tokens!";
  const msg = isFr
    ? "Tes 30 jetons bonus Premium viennent d'etre credites sur ton compte."
    : isDe ? "Deine 30 Premium-Bonus-Tokens wurden deinem Konto gutgeschrieben."
    : isEs ? "Tus 30 tokens bonus Premium han sido acreditados en tu cuenta."
    : "Your 30 Premium bonus tokens have been credited to your account.";
  const balanceLabel = isFr ? "Solde actuel" : isDe ? "Aktuelles Guthaben" : isEs ? "Saldo actual" : "Current balance";
  const btnText = isFr ? "Super !" : isDe ? "Super!" : isEs ? "Genial!" : "Awesome!";

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease";
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:340px;width:100%;padding:32px 24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:popIn .3s ease">
      <div style="font-size:2.5rem;margin-bottom:12px;">🎁</div>
      <h3 style="margin:0 0 8px;font-size:1.3rem;color:#1a1a1a;font-weight:700;">${title}</h3>
      <p style="margin:0 0 16px;font-size:0.92rem;color:#4b5563;line-height:1.5;">${msg}</p>
      <div style="background:#f3f4f6;border-radius:10px;padding:12px;margin-bottom:20px;">
        <span style="font-size:0.8rem;color:#6b7280;">${balanceLabel}</span><br/>
        <span style="font-size:1.4rem;font-weight:700;color:#7c3aed;">${totalTokens} tokens</span>
      </div>
      <button id="bonus-popup-close" style="background:#7c3aed;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:0.95rem;cursor:pointer;width:100%;">${btnText}</button>
    </div>`;
  document.body.appendChild(overlay);

  const style = document.createElement("style");
  style.textContent = "@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes popIn{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}";
  document.head.appendChild(style);

  document.getElementById("bonus-popup-close").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
}




	