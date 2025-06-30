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

// ✅ Nouvelle fonction dédiée pour débloquer un contenu privé (consommer jetons)
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
      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        alert(data.message || 'Erreur lors du déblocage.');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur lors du déblocage :', error);
    alert("Impossible de débloquer ce contenu.");
    return false;
  }
}

// Crée les cards HTML
function createPrivateContentCards(character, unlockedContents) {
  if (!character.privateContents || character.privateContents.length === 0) {
    return '';
  }

  let cardsHtml = '';

  character.privateContents.forEach(content => {
    const isUnlocked = unlockedContents.includes(content.folder);

    cardsHtml += `
      <div class="private-card" style="position: relative;">
        <img src="${content.preview}" alt="${content.title}" class="private-preview" style="filter: ${isUnlocked ? 'none' : 'blur(15px)'}; transition: filter 0.3s;">
        <h3>${content.title}</h3>
        <p>${content.description}</p>
        <button class="unlock-button" data-folder="${content.folder}" data-price="${content.price}" style="background-color: ${isUnlocked ? '#4CAF50' : '#dd4d9d'};">
          ${isUnlocked ? '✅ Voir le contenu' : `🔒 Débloquer pour ${content.price} jetons`}
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
      allContentsHtml += `
        <h2>${character.name} — Contenus privés</h2>
        <div class="private-cards-wrapper">
          ${cards}
        </div>
      `;
    }
  });

  container.innerHTML = allContentsHtml;

  // Ajouter écouteurs
  const unlockButtons = document.querySelectorAll('.unlock-button');
  unlockButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const folder = e.target.dataset.folder;
      const price = e.target.dataset.price;
      const previewImg = e.target.closest('.private-card').querySelector('.private-preview');
      const isUnlocked = e.target.innerText.includes("Voir le contenu");

      if (isUnlocked) {
        // 👉 Action "Voir le contenu"
        openPackModal(folder);
        return;
      }

      // Sinon => achat (consomme jetons)
      const success = await handlePrivateUnlock(price, folder);

      if (success) {
        previewImg.style.filter = 'none';
        e.target.innerHTML = "✅ Voir le contenu";
        e.target.style.backgroundColor = "#4CAF50";
      }
    });
  });
}

// 👉 Fonction pour ouvrir une modal ou rediriger
function openPackModal(folder) {
  console.log(`📂 Ouvrir le pack : ${folder}`);
  window.location.href = `/pack.html?folder=${encodeURIComponent(folder)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadCharacters();
});
