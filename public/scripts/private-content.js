console.log("🔐 Chargement du module Private Content");
const _fr = navigator.language?.startsWith("fr");
const _de = navigator.language?.startsWith("de");

function openJetonsPopup() {
  const popup = document.getElementById("jetons-popup");
  if (popup) {
    popup.classList.remove("hidden");
  } else {
    console.warn("❌ Popup jetons non trouvée !");
    window.location.href = "/jetons.html"; // 🔁 fallback de secours
  }
}


async function loadCharacters() {
  try {
    const response = await fetch('/characters.json');
    const characters = await response.json();
    renderPrivateContents(characters);
  } catch (error) {
    console.error("❌ Erreur de chargement du JSON :", error);
    const container = document.getElementById('private-contents');
    if (container) {
      container.innerHTML = "<p>Erreur de chargement du contenu privé.</p>";
    }
  }
}

async function loadUnlockedContents() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.email) {
    console.warn("⚠️ Aucun utilisateur connecté");
    return [];
  }

  try {
    const response = await fetch('/api/get-user-tokens', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email })
    });
    const data = await response.json();
    return data.unlockedContents || [];
  } catch (error) {
    console.error("❌ Erreur lors du chargement des contenus débloqués :", error);
    return [];
  }
}

// ✅ Fonction pour débloquer un contenu privé
async function handlePrivateUnlock(price, folder) {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || !user.email) {
    alert(_fr ? "Connecte-toi pour débloquer ce contenu." : _de ? "Melde dich an, um diesen Inhalt freizuschalten." : "Please log in to unlock this content.");
    window.location.href = 'profile.html';
    return false;
  }

  // ✅ 1) Vérifier que l'utilisateur est PREMIUM
  try {
    const premiumRes = await fetch('/api/is-premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    });

    const { isPremium } = await premiumRes.json();

    if (!isPremium) {
      alert(_fr ? "Réservé aux membres Premium." : _de ? "Nur für Premium-Mitglieder." : "Premium only.");
      window.location.href = '/premium.html';
      return false;
    }
  } catch (err) {
    console.error('❌ Erreur lors de la vérification Premium :', err);
    alert("Impossible de vérifier votre statut Premium. Veuillez réessayer.");
    return false;
  }

  // 🪙 2) À partir d’ici : on sait qu’il est Premium → logique jetons comme avant
  const priceInt = parseInt(price, 10);

  try {
    // ⚡️ Étape 1 : check rapide des jetons
    const tokensRes = await fetch('/api/get-user-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    });

    const tokensData = await tokensRes.json();
    const currentTokens = tokensData.tokens ?? 0;

    if (currentTokens < priceInt) {
      // 😱 Pas assez de jetons → check direct 1C
      const eligibleRes = await fetch('/api/check-one-click-eligibility', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });

      const eligibleData = await eligibleRes.json();
      if (eligibleData.eligible) {
        openJetonsPopup();
      } else {
        window.location.href = "/jetons.html";
      }

      return false;
    }

    // ✅ Suffisamment de jetons → on continue avec l’API principale
    document.getElementById("loader-overlay")?.classList.remove("hidden"); // ⏳ Affiche le loader

    const response = await fetch('/api/unlock-private-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, price: priceInt, folder })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Contenu débloqué : ${folder}, nouveaux jetons : ${data.newTokens}`);
      document.getElementById("loader-overlay")?.classList.add("hidden");
      return true;
    }

    // 🔁 Fallback si malgré tout on est en erreur
    if (data?.showJetonsPopup) {
      const eligibleRes = await fetch('/api/check-one-click-eligibility', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });

      const eligibleData = await eligibleRes.json();
      document.getElementById("loader-overlay")?.classList.add("hidden");

      if (eligibleData.eligible) {
        openJetonsPopup();
      } else {
        window.location.href = "/jetons.html";
      }
    }

    document.getElementById("loader-overlay")?.classList.add("hidden");
    return false;

  } catch (error) {
    console.error('❌ Erreur lors du déblocage :', error);
    document.getElementById("loader-overlay")?.classList.add("hidden");
    alert(_fr ? "Échec du déblocage de ce contenu." : _de ? "Freischalten fehlgeschlagen." : "Failed to unlock this content.");
    return false;
  }
}



// ✅ Crée les nouvelles cartes style Candy
function createPrivateContentCards(character, unlockedContents) {
  if (!character.privateContents || character.privateContents.length === 0) {
    return '';
  }

  let cardsHtml = '';

  character.privateContents.forEach(content => {
    const isUnlocked = unlockedContents.includes(content.folder);

    const profileExt = character.photo.split('.').pop().toLowerCase();
    const isVideo = profileExt === 'mp4';

    const profileMedia = isVideo
      ? `<video class="profile-pic" src="${character.photo}" autoplay muted loop playsinline></video>`
      : `<img class="profile-pic" src="${character.photo}" alt="Profil ${character.name}">`;

    const lockIconHtml = !isUnlocked
      ? `<div class="lock-icon"><i class="fas fa-lock"></i></div>`
      : '';

    cardsHtml += `
      <div class="private-content-card" data-folder="${content.folder}">
        <div class="private-profile-header">
          ${profileMedia}
          <span class="private-profile-name">${character.name}</span>
        </div>
        <div class="preview-wrapper">
          ${lockIconHtml}
          <img class="preview-image" src="${content.preview}" alt="${content.title}" style="filter: ${isUnlocked ? 'none' : 'blur(15px)'};">
        </div>
        <h3>${content.title}</h3>
        <p class="description">${content.description}</p>
        <div class="token-info"><i class="fas fa-coins"></i> ${content.price} ${_fr ? "Jeton" : _de ? "Token" : "Token"}</div>
        <div class="pack-info" style="font-size: 0.9em; color: #d1d1e0;">${_fr ? "Chargement…" : _de ? "Wird geladen…" : "Loading…"}</div>
        <button class="unlock-btn" data-folder="${content.folder}" data-price="${content.price}" style="background-color: ${isUnlocked ? '#4CAF50' : '#dd4d9d'};">
          ${isUnlocked ? (_fr ? '✅ Voir le contenu' : _de ? '✅ Inhalt ansehen' : '✅ View content') : (_fr ? 'Débloquer' : _de ? 'Freischalten' : 'Unlock')}
        </button>
      </div>
    `;
  });

  return cardsHtml;
}

async function renderPrivateContents(characters) {
  const container = document.getElementById('private-contents');
  if (!container) {
    console.error("❌ Pas de conteneur #private-contents trouvé");
    return;
  }

  const unlockedContents = await loadUnlockedContents();
  const user = JSON.parse(localStorage.getItem("user"));
  const userEmail = user?.email || '';

  let allContentsHtml = '';

  characters.forEach(character => {
    const cards = createPrivateContentCards(character, unlockedContents);
    if (cards) {
      allContentsHtml += cards;
    }
  });

  container.innerHTML = allContentsHtml;

  // ✅ Ajouter écouteurs sur les boutons
  const unlockButtons = document.querySelectorAll('.unlock-btn');
  unlockButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const card = e.target.closest('.private-content-card');
      const folder = e.target.dataset.folder;
      const price = e.target.dataset.price;
      const previewImg = card.querySelector('.preview-image');
      const isUnlocked = e.target.innerText.includes("Voir le contenu") || e.target.innerText.includes("View content") || e.target.innerText.includes("Inhalt ansehen");

      if (isUnlocked) {
        openPackModal(folder);
        return;
      }

      const success = await handlePrivateUnlock(price, folder);

      if (success) {
        previewImg.style.filter = 'none';
        e.target.innerHTML = _fr ? "✅ Voir le contenu" : _de ? "✅ Inhalt ansehen" : "✅ View content";
        e.target.style.backgroundColor = "#4CAF50";

        const lockIcon = card.querySelector('.lock-icon');
        if (lockIcon) {
          lockIcon.remove();
        }

        try {
          const res = await fetch(`/api/list-pack-files?folder=${encodeURIComponent(folder)}&email=${encodeURIComponent(userEmail)}`);
          const data = await res.json();
          const packInfo = card.querySelector('.pack-info');
          if (packInfo) {
            packInfo.innerHTML = `<i class="fas fa-image"></i> ${data.photosCount} • <i class="fas fa-video"></i> ${data.videosCount}`;
          }
        } catch (err) {
          console.error(`❌ Erreur mise à jour pack ${folder}:`, err);
        }
      }
    });
  });

  // ✅ Charger initialement les infos de pack
  
document.querySelectorAll('.private-content-card').forEach(async (card) => {
  const folder = card.getAttribute('data-folder');
  if (!folder) return;

  try {
    // ✅ Utiliser publicInfoOnly pour le chargement initial
    const res = await fetch(`/api/list-pack-files?folder=${encodeURIComponent(folder)}&publicInfoOnly=true`);
    const data = await res.json();

    const packInfo = card.querySelector('.pack-info');
    if (packInfo) {
      packInfo.innerHTML = `<i class="fas fa-image"></i> ${data.photosCount} • <i class="fas fa-video"></i> ${data.videosCount}`;
    }
  } catch (err) {
    console.error(`❌ Erreur infos pack ${folder}:`, err);
  }
});


}

// 👉 Fonction pour ouvrir la page pack
function openPackModal(folder) {
  console.log(`📂 Ouvrir le pack : ${folder}`);
  window.location.href = `/pack.html?folder=${encodeURIComponent(folder)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadCharacters();
});
