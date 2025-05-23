document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 🔁 Charger dynamiquement le menu HTML
    const res = await fetch("/menu.html");
    const html = await res.text();
    document.body.insertAdjacentHTML("afterbegin", html);

    // 🔘 Ajout des événements une fois le menu inséré
    const toggleButton = document.getElementById("menu-toggle");
    const closeButton = document.getElementById("menu-close");
    const menu = document.querySelector(".menu");
    const menuItems = document.getElementById("menu-items");

    toggleButton?.addEventListener("click", () => {
      menu.classList.add("open");
      menuItems.classList.add("visible");
    });

    closeButton?.addEventListener("click", () => {
      menu.classList.remove("open");
      menuItems.classList.remove("visible");
    });

    // 🌟 Bannière premium ou jetons
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
  } catch (err) {
    console.error("❌ Erreur chargement menu :", err);
  }
});
