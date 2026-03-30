// i18n-confirmation-jetons.js — Traduction française de confirmation-jetons.html
// Ajoute cette ligne dans confirmation-jetons.html juste avant </body> :
// <script type="module" src="/scripts/i18n-confirmation-jetons.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Jetons achetés – MyAiCrush";

  // ===== TITRE =====
  const title = document.querySelector("h1.p-title");
  if (title) title.textContent = "Tokens ajoutés ! 🎉";

  // ===== DESCRIPTIONS =====
  const descriptions = document.querySelectorAll("p.p-description");
  if (descriptions[0]) descriptions[0].textContent = "Tes tokens sont maintenant dans ton compte.";
  if (descriptions[1]) descriptions[1].textContent = "Utilise-les avec n'importe laquelle de tes IA.";
  if (descriptions[2]) descriptions[2].innerHTML = "Pour voir ton solde, rends-toi sur ton <b>Profil</b>.";
  if (descriptions[3]) descriptions[3].innerHTML = "Merci,<br>L'équipe MyAiCrush ❤️";

  // ===== BOUTON =====
  const startBtn = document.getElementById("startChatButton");
  if (startBtn) startBtn.textContent = "Commencer à chatter";

  // ===== SÉCURITÉ =====
  const securityItems = document.querySelectorAll(".security-item p");
  if (securityItems[0]) securityItems[0].textContent = "100% Sécurisé";
  if (securityItems[1]) securityItems[1].textContent = "Confidentialité totale";

}); // fin DOMContentLoaded

} // fin if (isFrench)