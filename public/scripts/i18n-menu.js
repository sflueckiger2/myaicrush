// i18n-menu.js — Traduction française du menu latéral (chargé dynamiquement)
// Ajoute cette ligne dans CHAQUE page juste après menu-loader.js :
// <script type="module" src="/scripts/i18n-menu.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

  const menuTranslations = [
    { href: "index.html",          text: "Choisir ta compagne" },
    { href: "profile.html",        text: "Mon profil" },
    { href: "premium.html",        text: "Premium" },
    { href: "contact.html",        text: "Contact" },
    { href: "contenu-prive.html",  text: "Contenu privé" },
  ];

  function traduireMenu() {
    const menuItems = document.querySelectorAll(".menu-items li a");
    if (!menuItems.length) return false;

    menuItems.forEach(link => {
      const match = menuTranslations.find(t => link.getAttribute("href") === t.href);
      if (match) {
        const icon = link.querySelector("i");
        link.textContent = match.text;
        if (icon) link.prepend(icon);
      }
    });

    return true;
  }

  // Le menu est injecté dynamiquement par menu-loader.js
  // On observe le DOM jusqu'à ce qu'il soit présent
  const observer = new MutationObserver(() => {
    if (traduireMenu()) observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Fallback au cas où le menu serait déjà là
  document.addEventListener("DOMContentLoaded", () => {
    if (traduireMenu()) observer.disconnect();
  });

}

const isGerman = navigator.language?.startsWith("de");

if (isGerman) {

  const menuTranslationsDE = [
    { href: "index.html",          text: "Wähle deine Begleiterin" },
    { href: "profile.html",        text: "Mein Profil" },
    { href: "premium.html",        text: "Premium" },
    { href: "contact.html",        text: "Kontakt" },
    { href: "contenu-prive.html",  text: "Exklusiver Content" },
  ];

  function traduireMenuDE() {
    const menuItems = document.querySelectorAll(".menu-items li a");
    if (!menuItems.length) return false;

    menuItems.forEach(link => {
      const match = menuTranslationsDE.find(t => link.getAttribute("href") === t.href);
      if (match) {
        const icon = link.querySelector("i");
        link.textContent = match.text;
        if (icon) link.prepend(icon);
      }
    });

    return true;
  }

  const observerDE = new MutationObserver(() => {
    if (traduireMenuDE()) observerDE.disconnect();
  });

  observerDE.observe(document.body, { childList: true, subtree: true });

  document.addEventListener("DOMContentLoaded", () => {
    if (traduireMenuDE()) observerDE.disconnect();
  });

}