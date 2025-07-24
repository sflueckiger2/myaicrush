document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 🔁 Charger dynamiquement le menu HTML
    const res = await fetch("/menu.html");
    const html = await res.text();
    document.body.insertAdjacentHTML("afterbegin", html);

    // 🎯 Sélection des éléments
    const toggleButton = document.getElementById("menu-toggle");
    const closeButton = document.getElementById("menu-close");
    const menu = document.querySelector(".menu");
    const menuItems = document.getElementById("menu-items");

    // 🎬 Ajout des événements d'ouverture/fermeture
    toggleButton?.addEventListener("click", () => {
      menu.classList.add("open");
      menuItems.classList.add("visible");
    });

    closeButton?.addEventListener("click", () => {
      menu.classList.remove("open");
      menuItems.classList.remove("visible");
    });

   // 💎 Bannière premium ou jetons (avec logique 1C)
const bannerContainer = document.getElementById("menu-banner-container");
const user = JSON.parse(localStorage.getItem("user"));

if (user?.email && bannerContainer) {
  const r = await fetch("/api/is-premium", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email })
  });
  const { isPremium } = await r.json();

  const banner = document.createElement("a");
  banner.className = "menu-banner";
  banner.href = "#"; // on gère le clic nous-mêmes
  banner.innerHTML = `
    <img 
      src="images/banners/${isPremium ? "menu-premium" : "menu-standard"}.webp" 
      alt="Menu Banner" 
      class="menu-banner-image">
  `;
  bannerContainer.appendChild(banner);

  // ✅ Gère le clic sur la bannière
  banner.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!user?.email) return;

    if (isPremium) {
      try {
        const res = await fetch("/api/check-one-click-eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });

        const data = await res.json();

        if (data.eligible) {
          openJetonsPopup(); // ✅ Affiche la popup d’achat
        } else {
          window.location.href = "/jetons.html"; // ❌ Redirige si non éligible
        }
      } catch (err) {
        console.error("❌ Erreur eligibility 1C :", err);
        window.location.href = "/jetons.html";
      }
    } else {
      window.location.href = "/premium.html"; // 🔁 Redirection pour non premium
    }
  });
}


    // 👀 Observer l'ouverture du chat pour cacher le menu
    const chatBox = document.getElementById("chat-box");

    if (chatBox && toggleButton && menu) {
      const observer = new MutationObserver(() => {
        const isChatOpen = getComputedStyle(chatBox).display === "flex";

        // Masquer le bouton et le menu quand le chat est ouvert
        toggleButton.style.display = isChatOpen ? "none" : "block";
        menu.style.display = isChatOpen ? "none" : "flex";

        // Fermer le menu si un chat démarre
        if (isChatOpen) {
          menu.classList.remove("open");
          menuItems.classList.remove("visible");
        }
      });

      observer.observe(chatBox, { attributes: true, attributeFilter: ["style"] });
    }

  } catch (err) {
    console.error("❌ Erreur chargement menu :", err);
  }
});
