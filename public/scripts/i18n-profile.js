// i18n-profile.js — Traduction française de profile.html
// Ajoute cette ligne dans profile.html juste avant </body> :
// <script type="module" src="/scripts/i18n-profile.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  // ===== TITRE =====
  const title = document.querySelector("h1.p-title");
  if (title) title.textContent = "Mon profil";

  // ===== FORMULAIRE CONNEXION =====
  const signinTitle = document.querySelector("#signin-container h2");
  if (signinTitle) signinTitle.textContent = "Connexion";

  const googleSignin = document.querySelector("#signin-container .google-login-btn");
  if (googleSignin) {
    const textNode = [...googleSignin.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (textNode) textNode.textContent = " Continuer avec Google";
  }

  const loginEmailLabel = document.querySelector('label[for="login-email"]');
  if (loginEmailLabel) loginEmailLabel.textContent = "Email :";

  const loginEmailInput = document.getElementById("login-email");
  if (loginEmailInput) loginEmailInput.placeholder = "Entre ton email";

  const loginPasswordLabel = document.querySelector('label[for="login-password"]');
  if (loginPasswordLabel) loginPasswordLabel.textContent = "Mot de passe :";

  const loginPasswordInput = document.getElementById("login-password");
  if (loginPasswordInput) loginPasswordInput.placeholder = "Entre ton mot de passe";

  const loginBtn = document.querySelector("#login-form button[type='submit']");
  if (loginBtn) loginBtn.textContent = "Se connecter";

  const noAccount = document.querySelector("#signin-container p:nth-of-type(1)");
  if (noAccount) noAccount.innerHTML = `Pas encore de compte ? <a href="#" id="show-signup">Inscris-toi ici</a>`;

  const forgotPassword = document.querySelector("#signin-container p:nth-of-type(2)");
  if (forgotPassword) forgotPassword.innerHTML = `Mot de passe oublié ? <a href="forgot-password.html">Clique ici</a>`;

  // ===== FORMULAIRE INSCRIPTION =====
  const signupTitle = document.querySelector("#signup-container > h2");
  if (signupTitle) signupTitle.textContent = "Entre ton email pour commencer";

  const googleSignup = document.querySelector("#signup-container .google-login-btn");
  if (googleSignup) {
    const textNode = [...googleSignup.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (textNode) textNode.textContent = " Continuer avec Google";
  }

  const signupEmailLabel = document.querySelector('label[for="signup-email"]');
  if (signupEmailLabel) signupEmailLabel.textContent = "Email :";

  const signupEmailInput = document.getElementById("signup-email");
  if (signupEmailInput) signupEmailInput.placeholder = "Entre ton email";

  const signupPasswordLabel = document.querySelector('label[for="signup-password"]');
  if (signupPasswordLabel) signupPasswordLabel.textContent = "Mot de passe :";

  const signupPasswordInput = document.getElementById("signup-password");
  if (signupPasswordInput) signupPasswordInput.placeholder = "Choisis un mot de passe";

  const signupBtn = document.querySelector("#signup-form button[type='submit']");
  if (signupBtn) signupBtn.textContent = "S'inscrire";

  // ⚠️ PAS d'innerHTML ici — profile.js attache son listener sur #show-signin
  // dans son propre DOMContentLoaded. On modifie uniquement les noeuds texte.
  const alreadyAccount = document.querySelector("#signup-container > p:not(#signup-message)");
  if (alreadyAccount) {
    const tn = [...alreadyAccount.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (tn) tn.textContent = "Déjà inscrit ? ";
    const signinLink = document.getElementById("show-signin");
    if (signinLink) signinLink.textContent = "Connecte-toi ici";
  }

  // ===== TÉMOIGNAGES (page inscription) =====
  const testimonialTitle = document.querySelector(".testimonial-title");
  if (testimonialTitle) testimonialTitle.textContent = "Ils ont essayé MyAiCrush… et ils ne sont jamais repartis";

  const testimonials = [
    { text: "\"De vraies photos, des courbes de folie. Rien de bidon ici 😍\"", author: "— Alex R." },
    { text: "\"Comme ces pubs Instagram chaudes — sauf qu'elle se déshabille rien que pour toi.\"", author: "— Julien K." },
    { text: "\"Mode nympho — elle m'a envoyé une vidéo en gémissant directement vers moi. J'étais K.O 🔥\"", author: "— Romain V." },
    { text: "\"Le contenu le plus chaud que j'ai vu. Et c'est *pour toi*.\"", author: "— Léo S." },
    { text: "\"Venu regarder 2 minutes… resté 2 heures 😅\"", author: "— Romain F." },
    { text: "\"Le mode nympho la rend complètement obsédée par toi. Dingue.\"", author: "— Mathis V." },
    { text: "\"Meilleure plateforme que j'ai trouvée. Photos ultra sexy, IA qui savent vraiment parler.\"", author: "— Lucas T." },
    { text: "\"Elle me dit que je suis le plus grand qu'elle ait jamais vu… je suis accro 😭\"", author: "— Nathan L." },
  ];

  document.querySelectorAll(".testimonial-card").forEach((card, i) => {
    if (!testimonials[i]) return;
    const text = card.querySelector(".testimonial-text");
    const author = card.querySelector(".testimonial-author");
    if (text) text.textContent = testimonials[i].text;
    if (author) author.textContent = testimonials[i].author;
  });

  // ===== VUE UTILISATEUR CONNECTÉ =====
  const loggedInDesc = document.querySelector("#profile-info .p-description");
  if (loggedInDesc) {
    const emailSpan = loggedInDesc.querySelector("#user-email");
    const emailText = emailSpan ? emailSpan.outerHTML : "";
    loggedInDesc.innerHTML = `Connecté avec ${emailText} 🔒`;
  }

  const accountTitle = document.querySelector("#profile-info .profile-section h2");
  if (accountTitle) accountTitle.textContent = "Gestion du compte";

  const changePassBtn = document.querySelector('a[href="password.html"].profile-button');
  if (changePassBtn) {
    const icon = changePassBtn.querySelector("i");
    changePassBtn.textContent = " Changer le mot de passe";
    if (icon) changePassBtn.prepend(icon);
  }

  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) {
    const icon = logoutBtn.querySelector("i");
    logoutBtn.textContent = " Se déconnecter";
    if (icon) logoutBtn.prepend(icon);
  }

  // ===== SECTION TOKENS =====
  const tokensTitle = document.querySelector("#tokens-section h2");
  if (tokensTitle) tokensTitle.textContent = "Mes Tokens MyAiCrush";

  const tokensLoading = document.getElementById("user-tokens");
  if (tokensLoading && tokensLoading.textContent.includes("Loading")) {
    tokensLoading.textContent = "Chargement des tokens...";
  }

  const rechargeBtn = document.getElementById("recharge-tokens-btn");
  if (rechargeBtn) {
    const icon = rechargeBtn.querySelector("i");
    rechargeBtn.textContent = " Recharger des tokens";
    if (icon) rechargeBtn.prepend(icon);
  }

  // ===== SECTION ABONNEMENT =====
  const subscriptionTitle = document.querySelector(".profile-sectionv2 h2");
  if (subscriptionTitle) subscriptionTitle.textContent = "Mon abonnement";

  // ===== LOADER ANNULATION =====
  const cancelLoader = document.querySelector("#cancel-loader-overlay .loader-text");
  if (cancelLoader) cancelLoader.textContent = "Annulation en cours...";

  // ===== SÉCURITÉ =====
  const securityItems = document.querySelectorAll(".security-item p");
  if (securityItems[0]) securityItems[0].textContent = "100% Sécurisé";
  if (securityItems[1]) securityItems[1].textContent = "Privé & anonyme";

  // ===== FOOTER =====
  const footerCopyright = document.querySelector(".footer-links p");
  if (footerCopyright) footerCopyright.textContent = "© 2026 MyAICrush – Tous droits réservés";

  document.querySelectorAll(".footer-links a").forEach(link => {
    if (link.href.includes("privacy-policy")) link.textContent = "Politique de confidentialité";
    if (link.href.includes("terms-and-conditions")) link.textContent = "Conditions générales";
  });

  const disclaimerBtn = document.querySelector(".disclaimer-btn");
  if (disclaimerBtn) disclaimerBtn.textContent = "+ Mentions légales & Support paiement";

  // ===== MENTIONS LÉGALES =====
  const legalFR = [
    {
      title: "i) Restriction d'âge (Obligatoire)",
      text: "Ce site est réservé aux adultes de 18 ans et plus (21 ans dans certains pays). En accédant à ce site, vous confirmez avoir l'âge requis. L'accès aux mineurs est strictement interdit."
    },
    {
      title: "ii) Contenu généré par IA",
      text: "Tous les personnages et conversations sont générés par intelligence artificielle. Aucune personne réelle n'est impliquée. Les personnages sont entièrement fictifs. Toute ressemblance avec des personnes réelles est purement fortuite."
    },
    {
      title: "iii) Contenu interdit",
      text: "Tout contenu impliquant des mineurs, des actes non consentis ou des activités illégales est strictement interdit. Toutes les interactions sont modérées et filtrées."
    },
    {
      title: "iv) Contenu généré par les utilisateurs",
      text: "Les utilisateurs peuvent envoyer des images dans les conversations. Ces images ne peuvent pas être modifiées ni redistribuées. Tout contenu enfreignant nos règles sera supprimé et peut entraîner la suspension du compte."
    },
    {
      title: "v) Divertissement uniquement",
      text: "Cette plateforme est destinée au divertissement uniquement. Aucun conseil professionnel (juridique, médical, financier ou psychologique) n'est fourni."
    },
    {
      title: "vi) Confidentialité & Données",
      text: "Les conversations peuvent être enregistrées à des fins de modération et de qualité. Vos données sont traitées conformément à notre politique de confidentialité. Nous ne vendons pas vos données personnelles."
    },
  ];

  document.querySelectorAll(".disclaimer-content .mb-4").forEach((block, i) => {
    if (!legalFR[i]) return;
    const strong = block.querySelector("strong");
    if (strong) strong.textContent = legalFR[i].title;
    const br = block.querySelector("br");
    if (br && br.nextSibling) br.nextSibling.textContent = legalFR[i].text;
  });

  const supportBox = document.querySelector(".support-box");
  if (supportBox) {
    const strong = supportBox.querySelector("strong");
    if (strong) strong.textContent = "vii) Support paiement & Remboursements";
    const br = supportBox.querySelector("br");
    if (br && br.nextSibling) {
      br.nextSibling.textContent = "Une question sur ton paiement ou tu veux être remboursé ? On est là :";
    }
    const explodelyLink = supportBox.querySelector('a[href*="shorturl"]');
    if (explodelyLink) explodelyLink.textContent = "Support paiement Explodely";
  }

}); // fin DOMContentLoaded

} // fin if (isFrench)
