// i18n-password.js — Traduction française de password.html
// Ajoute cette ligne dans password.html juste avant </body> :
// <script type="module" src="/scripts/i18n-password.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Mot de passe – MyAiCrush";

  // ===== TITRE =====
  const title = document.querySelector("h1.p-title");
  if (title) title.textContent = "Changer ton mot de passe";

  // ===== FORMULAIRE =====
  const currentLabel = document.querySelector('label[for="current-password"]');
  if (currentLabel) currentLabel.textContent = "Mot de passe actuel :";

  const currentInput = document.getElementById("current-password");
  if (currentInput) currentInput.placeholder = "Entre ton mot de passe actuel";

  const newLabel = document.querySelector('label[for="new-password"]');
  if (newLabel) newLabel.textContent = "Nouveau mot de passe :";

  const newInput = document.getElementById("new-password");
  if (newInput) newInput.placeholder = "Entre ton nouveau mot de passe";

  const confirmLabel = document.querySelector('label[for="confirm-password"]');
  if (confirmLabel) confirmLabel.textContent = "Confirmer le nouveau mot de passe :";

  const confirmInput = document.getElementById("confirm-password");
  if (confirmInput) confirmInput.placeholder = "Confirme ton nouveau mot de passe";

  const saveBtn = document.getElementById("change-password-button");
  if (saveBtn) saveBtn.textContent = "Enregistrer";

}); // fin DOMContentLoaded

} // fin if (isFrench)

const isGerman = navigator.language?.startsWith("de");

if (isGerman) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Passwort – MyAiCrush";

  const title = document.querySelector("h1.p-title");
  if (title) title.textContent = "Passwort ändern";

  const currentLabel = document.querySelector('label[for="current-password"]');
  if (currentLabel) currentLabel.textContent = "Aktuelles Passwort:";

  const currentInput = document.getElementById("current-password");
  if (currentInput) currentInput.placeholder = "Aktuelles Passwort eingeben";

  const newLabel = document.querySelector('label[for="new-password"]');
  if (newLabel) newLabel.textContent = "Neues Passwort:";

  const newInput = document.getElementById("new-password");
  if (newInput) newInput.placeholder = "Neues Passwort eingeben";

  const confirmLabel = document.querySelector('label[for="confirm-password"]');
  if (confirmLabel) confirmLabel.textContent = "Neues Passwort bestätigen:";

  const confirmInput = document.getElementById("confirm-password");
  if (confirmInput) confirmInput.placeholder = "Neues Passwort nochmal eingeben";

  const saveBtn = document.getElementById("change-password-button");
  if (saveBtn) saveBtn.textContent = "Speichern";

}); // fin DOMContentLoaded

} // fin if (isGerman)