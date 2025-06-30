console.log("🔐 Chargement du module Private Content");

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
    alert('Veuillez vous connecter pour débloquer ce contenu.');
    window.location.href = 'profile.html';
    return false;
  }

  try {
    const response = await fetch('/api/unlock-private-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, price: parseInt(price), folder })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Contenu débloqué : ${folder}, nouveaux jetons : ${data.newTokens}`);
      return true;
    } else {
      if (data.message) {
        alert(data.message);
      }
      if (data.redirect) {
        window.location.href = data.redirect;
      }
      return false;
    }

  } catch (error) {
    console.error('❌ Erreur lors du déblocage :', error);
    alert("Impossible de débloquer ce contenu.");
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

   cardsHtml += `
  <div class="private-content-card">
    <div class="private-profile-header">
      ${profileMedia}
      <span class="private-profile-name">${character.name}</span>
    </div>
    <div class="preview-wrapper">
      <img class="preview-image" src="${content.preview}" alt="${content.title}" style="filter: ${isUnlocked ? 'none' : 'blur(15px)'};">
      ${!isUnlocked ? '<div class="lock-overlay"><i class="fas fa-lock"></i></div>' : ''}
    </div>
    <h3>${content.title}</h3>
    <p class="description">${content.description}</p>
    <div class="token-info"><i class="fas fa-coins"></i> ${content.price} Jetons</div>
    <button class="unlock-btn" data-folder="${content.folder}" data-price="${content.price}" style="background-color: ${isUnlocked ? '#4CAF50' : '#dd4d9d'};">
      ${isUnlocked ? '✅ Voir le contenu' : `Débloquer`}
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

  let allContentsHtml = '';

  characters.forEach(character => {
    const cards = createPrivateContentCards(character, unlockedContents);
    if (cards) {
      allContentsHtml += cards;
    }
  });

  container.innerHTML = allContentsHtml;

  // Ajouter écouteurs
  const unlockButtons = document.querySelectorAll('.unlock-btn');
  unlockButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const folder = e.target.dataset.folder;
      const price = e.target.dataset.price;
      const previewImg = e.target.closest('.private-content-card').querySelector('.preview-image');
      const isUnlocked = e.target.innerText.includes("Voir le contenu");

      if (isUnlocked) {
        openPackModal(folder);
        return;
      }

      const success = await handlePrivateUnlock(price, folder);

      if (success) {
        previewImg.style.filter = 'none';
        e.target.innerHTML = "✅ Voir le contenu";
        e.target.style.backgroundColor = "#4CAF50";
      }
    });
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
