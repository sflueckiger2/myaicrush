// i18n-cancellation.js — Traduction française de cancellation.html
// Référence dans cancellation.html juste avant </body> :
// <script type="module" src="/scripts/i18n-cancellation.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Abonnement annulé";

  const h1 = document.querySelector("h1.cancel-title");
  if (h1) h1.textContent = "Votre abonnement a été annulé";

  const subtitle = document.querySelector("p.cancel-subtitle");
  if (subtitle) {
    subtitle.textContent =
      "Nous sommes désolés de vous voir partir. Votre annulation a été confirmée.";
  }

  const infoStrong = document.querySelector(".cancel-info-box strong");
  if (infoStrong) infoStrong.textContent = "📅 Vous avez encore accès jusqu'au :";

  const expiresLabel = document.getElementById("expires-label");
  if (expiresLabel && expiresLabel.textContent.trim() === "Loading...") {
    expiresLabel.textContent = "Chargement...";
  }

  const infoBox = document.querySelector(".cancel-info-box");
  if (infoBox) {
    for (const node of infoBox.childNodes) {
      if (
        node.nodeType === Node.TEXT_NODE &&
        node.textContent.includes("Your Premium features")
      ) {
        node.textContent =
          "\n      Vos fonctionnalités Premium resteront actives jusqu'à cette date. Après cela, votre compte repassera en mode gratuit.\n    ";
        break;
      }
    }
  }

  const btnPremium = document.querySelector("a.cancel-btn[href='premium.html']");
  if (btnPremium) btnPremium.textContent = "🚀 Réactiver le Premium";

  const btnHome = document.querySelector("a.cancel-btn-ghost[href='index.html']");
  if (btnHome) btnHome.textContent = "Retour à l'accueil";

}); // fin DOMContentLoaded
} // fin if (isFrench)

const isGerman = navigator.language?.startsWith("de");

if (isGerman) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Abo gekündigt";

  const h1 = document.querySelector("h1.cancel-title");
  if (h1) h1.textContent = "Dein Abo wurde gekündigt";

  const subtitle = document.querySelector("p.cancel-subtitle");
  if (subtitle) {
    subtitle.textContent =
      "Schade, dass du gehst. Deine Kündigung wurde bestätigt.";
  }

  const infoStrong = document.querySelector(".cancel-info-box strong");
  if (infoStrong) infoStrong.textContent = "📅 Du hast noch Zugang bis:";

  const expiresLabel = document.getElementById("expires-label");
  if (expiresLabel && expiresLabel.textContent.trim() === "Loading...") {
    expiresLabel.textContent = "Wird geladen...";
  }

  const infoBox = document.querySelector(".cancel-info-box");
  if (infoBox) {
    for (const node of infoBox.childNodes) {
      if (
        node.nodeType === Node.TEXT_NODE &&
        node.textContent.includes("Your Premium features")
      ) {
        node.textContent =
          "\n      Deine Premium-Funktionen bleiben bis zu diesem Datum aktiv. Danach wird dein Konto auf den kostenlosen Plan zurückgesetzt.\n    ";
        break;
      }
    }
  }

  const btnPremium = document.querySelector("a.cancel-btn[href='premium.html']");
  if (btnPremium) btnPremium.textContent = "🚀 Premium reaktivieren";

  const btnHome = document.querySelector("a.cancel-btn-ghost[href='index.html']");
  if (btnHome) btnHome.textContent = "Zurück zur Startseite";

}); // fin DOMContentLoaded
} // fin if (isGerman)
