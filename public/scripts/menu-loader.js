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

    // 💎 Bannière premium ou jetons
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
      banner.href = isPremium ? "jetons.html" : "premium.html";
      banner.innerHTML = `
        <img 
          src="images/banners/${isPremium ? "menu-premium" : "menu-standard"}.webp" 
          alt="Menu Banner" 
          class="menu-banner-image">
      `;
      bannerContainer.appendChild(banner);
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
