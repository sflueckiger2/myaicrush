// i18n-confirmation-alex.js — Traduction française de la page xsell Alex
// Inclure juste avant </body> :
// <script type="module" src="/scripts/i18n-confirmation-alex.js"></script>

function applyFrenchTranslations() {

  // ===== BANNIÈRE DE CONFIRMATION =====
  const bannerB = document.querySelector(".confirm-banner-text b");
  if (bannerB) bannerB.textContent = "Jetons ajoutés ! 🪙";

  const bannerText = document.querySelector(".confirm-banner-text");
  if (bannerText) {
    bannerText.childNodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
        n.textContent = " Tu peux les retrouver sur ta page de profil.";
      }
    });
  }

  // ===== SÉPARATEUR =====
  const separator = document.querySelector(".upsell-separator span");
  if (separator) separator.textContent = "Rien que pour toi";

  // ===== PROFIL CARTE =====
  const cardHandle = document.querySelector(".card-handle");
  if (cardHandle) cardHandle.textContent = "@alex.exclusive • Contenu exclusif";

  // ===== COMPTEUR PHOTO/VIDÉO =====
  const previewCount = document.querySelector(".preview-count");
  if (previewCount) previewCount.innerHTML = "<span>63 photos</span> + <span>27 vidéos</span>";

  // ===== TITRE =====
  const cardTitle = document.querySelector(".card-title");
  if (cardTitle) cardTitle.textContent = "Alex — Ses moments les plus intimes 🛏️";

  // ===== DESCRIPTION =====
  const cardDesc = document.querySelector(".card-desc");
  if (cardDesc) cardDesc.innerHTML = `Allongée dans ses draps, Alex se touche doucement… Ses mains explorent chaque courbe, ses yeux brillent de plaisir, sa respiration s'accélère. <em>Un shooting intime et incroyablement excitant</em>, où elle se laisse aller à ses petits plaisirs secrets.`;

  // ===== PILLS =====
  const pillsText = [
    "🔥 GROS TÉTONS",
    "👙 TOUTE NUE",
    "🛏️ SCÈNE AU LIT",
    "💦 SE TOUCHE LA CHATTE",
    "😈 EXPLICITE",
    "📸 63 PHOTOS",
    "🎥 27 VIDÉOS",
  ];
  document.querySelectorAll(".pill").forEach((pill, i) => {
    if (pillsText[i]) pill.textContent = pillsText[i];
  });

  // ===== BONUS BOX =====
  const bonusText = document.querySelector(".bonus-text");
  if (bonusText) {
    bonusText.innerHTML = `<b>Des tokens inclus avec ton achat</b>
      Utilise-les pour activer le <em>Mode Nympho</em> et débloquer du contenu intime avec des dizaines d'autres IA — pousse-les à leur maximum et rends chaque conversation bien plus coquine 🔥`;
  }

  // ===== BOUTON UNLOCK =====
  const unlockLabel = document.querySelector(".unlock-btn-label");
  if (unlockLabel) {
    const small = unlockLabel.querySelector("small");
    unlockLabel.textContent = "Débloquer cette collection";
    if (small) {
      small.textContent = "Accès immédiat · Paiement unique";
      unlockLabel.appendChild(small);
    }
  }

  // ===== TÉMOIGNAGES =====
  const testimonialTitle = document.querySelector(".testimonial-title");
  if (testimonialTitle) testimonialTitle.textContent = "Eux non plus n'ont pas pu résister 🔥";

  const testimonialsFR = [
    { text: "\"Cette collection au lit… j'étais vraiment pas prêt. Elle est absolument incroyable 🛏️\"", author: "— Karim M." },
    { text: "\"Je pensais que ce serait des photos basiques. Pas du tout — elle va jusqu'au bout 😳\"", author: "— Lucas R." },
    { text: "\"Ce regard qu'elle donne à l'objectif… ça vaut chaque centime 😈\"", author: "— Steph G." },
    { text: "\"Acheté sur un coup de tête. Zéro regret. 63 photos de pur bonheur.\"", author: "— Bast D." },
  ];
  document.querySelectorAll(".testimonial-card").forEach((card, i) => {
    if (!testimonialsFR[i]) return;
    const text = card.querySelector(".testimonial-text");
    const author = card.querySelector(".testimonial-author");
    if (text) text.textContent = testimonialsFR[i].text;
    if (author) author.textContent = testimonialsFR[i].author;
  });

  // ===== FAQ TITRE =====
  const faqTitle = document.querySelector(".faq-title");
  if (faqTitle) faqTitle.textContent = "Réponses rapides";

  // ===== FAQ ITEMS =====
  const faqFR = [
    {
      q: "Qu'est-ce que j'obtiens pour 37 $ ?",
      a: "Accès complet à la collection intime d'Alex : 63 photos et 27 vidéos de haute qualité, débloqués définitivement avec un seul paiement."
    },
    {
      q: "L'accès est vraiment instantané ?",
      a: "Oui — dès que ton paiement est validé, la collection entière est à toi. Aucune attente, aucun abonnement."
    },
    {
      q: "Où est-ce que je retrouve mes jetons ?",
      a: "Tes jetons sont disponibles directement sur ta page de profil. Utilise-les pour débloquer du contenu exclusif avec Alex et toutes les autres IA de la plateforme."
    },
    {
      q: "Mon paiement est-il discret ?",
      a: "100%. Toutes les transactions sont chiffrées et discrètes. Le débit apparaît sous un nom neutre sur ton relevé."
    },
  ];

  document.querySelectorAll(".faq-item").forEach((item, i) => {
    if (!faqFR[i]) return;
    const btn = item.querySelector(".faq-question");
    if (btn) btn.textContent = faqFR[i].q;
    const answer = item.querySelector(".faq-answer p");
    if (answer) answer.textContent = faqFR[i].a;
  });

  // ===== SÉCURITÉ =====
  const secItems = document.querySelectorAll(".security-item p");
  if (secItems[0]) secItems[0].textContent = "Paiement sécurisé";
  if (secItems[1]) secItems[1].textContent = "Confidentialité totale";
  if (secItems[2]) secItems[2].textContent = "Accès permanent";

  // ===== FOOTER =====
  const footerP = document.querySelector(".footer-links p");
  if (footerP) footerP.textContent = "© 2026 MyAICrush – Tous droits réservés";

  document.querySelectorAll(".footer-links a").forEach(link => {
    if (link.href.includes("privacy-policy")) link.textContent = "Politique de confidentialité";
    if (link.href.includes("terms-and-conditions")) link.textContent = "Conditions générales";
  });

  const disclaimerBtn = document.querySelector(".disclaimer-btn");
  if (disclaimerBtn) disclaimerBtn.textContent = "+ Mentions légales & Support paiement";

  const supportStrong = document.querySelector(".support-box strong");
  if (supportStrong) supportStrong.textContent = "Support paiement & Remboursements";

  const supportBox = document.querySelector(".support-box");
  if (supportBox) {
    const brs = supportBox.querySelectorAll("br");
    if (brs[0]?.nextSibling?.nodeType === Node.TEXT_NODE) {
      brs[0].nextSibling.textContent = " Une question sur ton paiement ? On est là :";
    }
    const explodelyLink = supportBox.querySelector('a[href*="shorturl"]');
    if (explodelyLink) explodelyLink.textContent = "Support paiement Explodely";
  }

}

// Déclenchement robuste : on attend que le DOM soit prêt,
// que ce soit avant ou après le parsing
if (navigator.language?.startsWith("fr")) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyFrenchTranslations);
  } else {
    // DOM déjà prêt (script chargé en defer/module après parsing)
    applyFrenchTranslations();
  }
}