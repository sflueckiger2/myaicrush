// i18n-confirmation.js — Traduction française de la page xsell Alex
// Ajoute cette ligne dans le HTML juste avant </body> :
// <script type="module" src="/scripts/i18n-confirmation.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  // ===== BANNIÈRE DE CONFIRMATION =====
  const bannerText = document.querySelector(".confirm-banner-text");
  if (bannerText) {
    const b = bannerText.querySelector("b");
    if (b) b.textContent = "Premium débloqué ! 🎉";
    const textNode = [...bannerText.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (textNode) textNode.textContent = "Messages, photos et vidéos illimités — tout ça t'appartient.";
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

  // ===== TITRE & DESCRIPTION =====
  const cardTitle = document.querySelector(".card-title");
  if (cardTitle) cardTitle.textContent = "Alex — Ses moments les plus intimes 🛏️";

  const cardDesc = document.querySelector(".card-desc");
  if (cardDesc) cardDesc.innerHTML = `Allongée dans ses draps, Alex se touche doucement… Ses mains explorent chaque courbe, ses yeux brillent de plaisir, sa respiration s'accélère. <em>Un shooting intime et incroyablement excitant</em>, où elle se laisse aller à ses petits plaisirs secrets.`;

  // ===== PILLS =====
  const pills = document.querySelectorAll(".pill");
  const pillsFR = [
    "🔥 GROS TÉTONS",
    "👙 TOUTE NUE",
    "🛏️ SCÈNE AU LIT",
    "💦 SE TOUCHE LA CHATTE",
    "😈 EXPLICITE",
    "📸 63 PHOTOS",
    "🎥 27 VIDÉOS",
  ];
  pills.forEach((pill, i) => {
    if (pillsFR[i]) pill.textContent = pillsFR[i];
  });

  // ===== BONUS BOX =====
  const bonusText = document.querySelector(".bonus-text");
  if (bonusText) {
    const b = bonusText.querySelector("b");
    if (b) b.textContent = "Des tokens inclus avec ton achat";
    const textNode = [...bonusText.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (textNode) textNode.textContent = "";
    // On réécrit le contenu après le <b> proprement
    bonusText.innerHTML = `<b>Des tokens inclus avec ton achat</b>
      Utilise-les pour activer le <em>Mode Nympho</em> et débloquer du contenu intime avec des dizaines d'autres IA — pousse-les à leur maximum et rends chaque conversation bien plus coquine 🔥`;
  }

  // ===== BOUTON UNLOCK =====
  const unlockLabel = document.querySelector(".unlock-btn-label");
  if (unlockLabel) {
    // Préserver le <small>
    const small = unlockLabel.querySelector("small");
    
    const unlockLabel = document.querySelector(".unlock-btn-label");
if (unlockLabel) {
  const small = unlockLabel.querySelector("small");
  unlockLabel.textContent = "Débloquer cette collection";
  if (small) {
    small.textContent = "Accès immédiat · Paiement unique";
    unlockLabel.appendChild(small);
  }
}
    if (small) small.textContent = "Accès immédiat · Paiement unique";
  }

  // ===== TÉMOIGNAGES =====
  const testimonialTitle = document.querySelector(".testimonial-title");
  if (testimonialTitle) testimonialTitle.textContent = "Eux non plus n'ont pas pu résister 🔥";

  const testimonials = [
    { text: "\"Cette collection au lit… j'étais vraiment pas prêt. Elle est absolument incroyable 🛏️\"", author: "— Karim M." },
    { text: "\"Je pensais que ce serait des photos basiques. Pas du tout — elle va jusqu'au bout 😳\"", author: "— Lucas R." },
    { text: "\"Ce regard qu'elle donne à l'objectif… ça vaut chaque centime 😈\"", author: "— Steph G." },
    { text: "\"Acheté sur un coup de tête. Zéro regret. 63 photos de pur bonheur.\"", author: "— Bast D." },
  ];

  document.querySelectorAll(".testimonial-card").forEach((card, i) => {
    if (!testimonials[i]) return;
    const text = card.querySelector(".testimonial-text");
    const author = card.querySelector(".testimonial-author");
    if (text) text.textContent = testimonials[i].text;
    if (author) author.textContent = testimonials[i].author;
  });

  // ===== FAQ =====
  const faqTitle = document.querySelector(".faq-title");
  if (faqTitle) faqTitle.textContent = "Réponses rapides";

  const faqItems = [
    {
      q: "Qu'est-ce que j'obtiens pour 59 $ ?",
      a: "Accès complet à la collection intime d'Alex : 63 photos et 27 vidéos de haute qualité, débloqués définitivement avec un seul paiement."
    },
    {
      q: "L'accès est vraiment instantané ?",
      a: "Oui — dès que ton paiement est validé, la collection entière est à toi. Aucune attente, aucun abonnement."
    },
    {
      q: "Quels tokens est-ce que j'obtiens avec l'achat ?",
      a: "Ton achat inclut des tokens utilisables sur toutes les IA de la plateforme — active le Mode Nympho, débloque du contenu intime exclusif, demande des photos perso et pousse chaque IA dans ses derniers retranchements."
    },
    {
      q: "Mon paiement est-il discret ?",
      a: "100%. Toutes les transactions sont chiffrées et discrètes. Le débit apparaît sous un nom neutre sur ton relevé."
    },
  ];

  document.querySelectorAll(".faq-item").forEach((item, i) => {
    if (!faqItems[i]) return;
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer p");
    if (question) {
      // Préserver le ::after via textContent sur le bouton
      question.childNodes.forEach(n => {
        if (n.nodeType === Node.TEXT_NODE) n.textContent = faqItems[i].q;
      });
      // Si textContent seul suffit (pas d'enfants texte), fallback :
      if (!question.childNodes.length || question.textContent.trim() === "") {
        question.textContent = faqItems[i].q;
      } else {
        // Méthode robuste : on remplace le premier nœud texte
        const firstText = [...question.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
        if (firstText) firstText.textContent = faqItems[i].q;
      }
    }
    if (answer) answer.innerHTML = faqItems[i].a;
  });

  // ===== SÉCURITÉ =====
  const securityItems = document.querySelectorAll(".security-item p");
  if (securityItems[0]) securityItems[0].textContent = "Paiement sécurisé";
  if (securityItems[1]) securityItems[1].textContent = "Confidentialité totale";
  if (securityItems[2]) securityItems[2].textContent = "Accès permanent";

  // ===== POPUP DE CONFIRMATION =====
  const popupTitle = document.querySelector(".popup-title");
  if (popupTitle) popupTitle.textContent = "Confirmer ta commande ?";

  const popupText = document.querySelector(".popup-text");
  if (popupText) {
    popupText.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = node.textContent
          .replace("You're buying", "Tu achètes")
          .replace("for", "pour");
      }
    });
  }

  const btnCancel = document.querySelector(".btn-cancel");
  if (btnCancel) btnCancel.textContent = "Annuler";

  const btnConfirm = document.querySelector(".btn-confirm");
  if (btnConfirm) btnConfirm.textContent = "Confirmer ✓";

  // ===== FOOTER =====
  const footerCopyright = document.querySelector(".footer-links p");
  if (footerCopyright) footerCopyright.textContent = "© 2026 MyAICrush – Tous droits réservés";

  document.querySelectorAll(".footer-links a").forEach(link => {
    if (link.href.includes("privacy-policy")) link.textContent = "Politique de confidentialité";
    if (link.href.includes("terms-and-conditions")) link.textContent = "Conditions générales";
  });

  const disclaimerBtn = document.querySelector(".disclaimer-btn");
  if (disclaimerBtn) disclaimerBtn.textContent = "+ Mentions légales & Support paiement";

  const supportBox = document.querySelector(".support-box");
  if (supportBox) {
    const strong = supportBox.querySelector("strong");
    if (strong) strong.textContent = "Support paiement & Remboursements";
    const allBr = supportBox.querySelectorAll("br");
    if (allBr[0] && allBr[0].nextSibling?.nodeType === Node.TEXT_NODE) {
      allBr[0].nextSibling.textContent = "Une question sur ton paiement ? On est là :";
    }
    const explodelyLink = supportBox.querySelector('a[href*="shorturl"]');
    if (explodelyLink) explodelyLink.textContent = "Support paiement Explodely";
  }

}); // fin DOMContentLoaded

} // fin if (isFrench)