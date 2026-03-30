// i18n-forgot-password.js — Traduction française de forgot-password.html
// Ajoute cette ligne dans forgot-password.html juste avant </body> :
// <script type="module" src="/scripts/i18n-forgot-password.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Mot de passe oublié – MyAiCrush";

  // ===== SUBTITLE =====
  const subtitle = document.querySelector(".subtitle");
  if (subtitle) subtitle.innerHTML = "Mot de passe oublié ?<br>Entre ton email et on t'envoie un lien de réinitialisation.";

  // ===== FORMULAIRE =====
  const emailLabel = document.querySelector('label[for="email"]');
  if (emailLabel) emailLabel.textContent = "Adresse email";

  const emailInput = document.getElementById("email");
  if (emailInput) emailInput.placeholder = "toi@email.com";

  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.textContent = "Envoyer le lien";

  // ===== MESSAGES D'ÉTAT =====
  // On intercepte AVANT la soumission pour traduire le message après la réponse API
  const form = document.getElementById("forgotForm");
  const messageEl = document.getElementById("message");

  if (form && messageEl) {
    form.addEventListener("submit", () => {
      // On attend que le JS original ait fini d'écrire le message, puis on traduit
      const waitForMessage = setInterval(() => {
        const text = messageEl.textContent.trim();
        if (!text) return;

        clearInterval(waitForMessage);

        if (messageEl.classList.contains("success")) {
          messageEl.textContent = "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé. Ça peut prendre quelques minutes.";
        } else if (messageEl.classList.contains("error")) {
          if (text.includes("Server error")) {
            messageEl.textContent = "Erreur serveur. Réessaie dans un instant.";
          } else {
            messageEl.textContent = "Une erreur s'est produite. Merci de réessayer.";
          }
        }
      }, 100);
    }, true); // capture phase pour s'assurer qu'on se branche avant le JS original
  }

  // ===== LIEN RETOUR =====
  const backLink = document.querySelector(".back-link a");
  if (backLink) backLink.textContent = "Retour à la connexion";

}); // fin DOMContentLoaded

} // fin if (isFrench)

const isGerman = navigator.language?.startsWith("de");

if (isGerman) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Passwort vergessen – MyAiCrush";

  const subtitle = document.querySelector(".subtitle");
  if (subtitle) subtitle.innerHTML = "Passwort vergessen?<br>Gib deine E-Mail ein und wir senden dir einen Link zum Zurücksetzen.";

  const emailLabel = document.querySelector('label[for="email"]');
  if (emailLabel) emailLabel.textContent = "E-Mail-Adresse";

  const emailInput = document.getElementById("email");
  if (emailInput) emailInput.placeholder = "du@email.com";

  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.textContent = "Link senden";

  const form = document.getElementById("forgotForm");
  const messageEl = document.getElementById("message");

  if (form && messageEl) {
    form.addEventListener("submit", () => {
      const waitForMessage = setInterval(() => {
        const text = messageEl.textContent.trim();
        if (!text) return;

        clearInterval(waitForMessage);

        if (messageEl.classList.contains("success")) {
          messageEl.textContent = "Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet. Das kann ein paar Minuten dauern.";
        } else if (messageEl.classList.contains("error")) {
          if (text.includes("Server error")) {
            messageEl.textContent = "Serverfehler. Versuche es gleich nochmal.";
          } else {
            messageEl.textContent = "Ein Fehler ist aufgetreten. Bitte versuche es erneut.";
          }
        }
      }, 100);
    }, true);
  }

  const backLink = document.querySelector(".back-link a");
  if (backLink) backLink.textContent = "Zurück zur Anmeldung";

}); // fin DOMContentLoaded

} // fin if (isGerman)
