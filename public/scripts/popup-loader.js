// popup-loader.js
fetch("/popup1c.html")
  .then(res => res.text())
  .then(html => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Injecte les éléments HTML
    const popupElements = doc.body.children;
    for (const el of popupElements) {
      document.body.appendChild(el.cloneNode(true));
    }

    // Recharge les fonctions dans le scope global
    const script = doc.querySelector("script");
    if (script) {
      const newScript = document.createElement("script");
      newScript.textContent = script.textContent;
      document.body.appendChild(newScript);

      // ✅ 🔁 Rebind les clics sur les offres juste après injection
      setTimeout(() => {
        document.querySelectorAll(".offer-img").forEach(img => {
          img.addEventListener("click", () => {
            const tokens = img.dataset.tokens;
            const price = img.dataset.price;
            selectOffer(tokens, price); // Appelle la fonction dans le script injecté
          });
        });
      }, 100); // petit délai pour s'assurer que DOM est prêt
    }
  })
  .catch(err => {
    console.error("❌ Erreur lors du chargement de popup1c.html :", err);
  });
