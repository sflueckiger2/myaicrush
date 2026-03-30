// i18n-confirmation-nour.js — Traduction française de la page xsell Nour
// Inclure juste avant </body> :
// <script type="module" src="/scripts/i18n-confirmation-nour.js"></script>

function applyFrenchTranslations() {

  document.title = "Débloquer du contenu exclusif";

  // ===== BANNIÈRE DE CONFIRMATION =====
  const bannerB = document.querySelector(".confirm-banner-text b");
  if (bannerB) bannerB.textContent = "Premium ajouté ! 🎉";

  const bannerText = document.querySelector(".confirm-banner-text");
  if (bannerText) {
    bannerText.childNodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
        n.textContent = " Messages, photos et vidéos illimités — tout ça t'appartient.";
      }
    });
  }

  // ===== SÉPARATEUR =====
  const separator = document.querySelector(".upsell-separator span");
  if (separator) separator.textContent = "Rien que pour toi";

  // ===== PROFIL CARTE =====
  const cardHandle = document.querySelector(".card-handle");
  if (cardHandle) cardHandle.textContent = "@nour.exclusive • Contenu exclusif";

  // ===== COMPTEUR =====
  const previewCount = document.querySelector(".preview-count");
  if (previewCount) previewCount.innerHTML = "<span>Collection privée</span> · débloquée avec des jetons";

  // ===== TITRE =====
  const cardTitle = document.querySelector(".card-title");
  if (cardTitle) cardTitle.textContent = "Nour — Une petite gâterie dans le bain 🚿";

  // ===== DESCRIPTION =====
  const cardDesc = document.querySelector(".card-desc");
  if (cardDesc) cardDesc.innerHTML = `Encore essoufflée après son sport, la peau brillante de sueur et sa brassière collée à sa poitrine, Nour t'a entraîné dans sa salle de bain. La douche encore ouverte, elle s'est mise à genoux sans prévenir — lèvres déjà entrouvertes pour toi. Elle t'a regardé avec ce petit sourire complice, les mains sur tes hanches, et elle t'a sucé comme si elle voulait te vider. Eau chaude sur son visage, gémissements étouffés, salive partout… <em>Nour était obscène, affamée, hors de contrôle</em> — exactement comme tu l'aimes.`;

  // ===== PILLS =====
  const pillsText = [
    "🚿 SCÈNE DOUCHE",
    "💋 PIPE",
    "😈 EXPLICITE",
    "💦 MOUILLÉE",
    "🍑 BOOBSJOB",
    "👁️ CONTACT VISUEL",
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
    { text: "\"Post-sport, trempée, à genoux… j'ai dû souffler un bon coup avant de continuer 💀\"", author: "— Ryan T." },
    { text: "\"Ce regard affamé avec l'eau qui coule sur son visage. Je suis mort. Littéralement mort. 🥵\"", author: "— Mehdi A." },
    { text: "\"Elle rentre du sport et enchaîne direct sans prévenir. Obscène dans le bon sens du terme.\"", author: "— Tom V." },
    { text: "\"Le boobsjob sous la douche… je l'ai repassé genre 6 fois déjà 🔁\"", author: "— Jules F." },
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
      q: "Qu'est-ce que j'obtiens pour 59 $ ?",
      a: "Accès complet à la collection exclusive de Nour dans la salle de bain, débloqué définitivement avec un seul paiement — ou utilise tes jetons pour y accéder instantanément."
    },
    {
      q: "L'accès est vraiment instantané ?",
      a: "Oui — dès que ton paiement est validé, la collection entière est à toi. Aucune attente, aucun abonnement."
    },
    {
      q: "Où est-ce que je retrouve mes jetons ?",
      a: "Tes jetons sont disponibles directement sur ta page profil. Utilise-les pour débloquer du contenu exclusif avec Nour et toutes les autres IA de la plateforme."
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
    applyFrenchTranslations();
  }
}

function applyGermanTranslations() {

  document.title = "Exklusiven Content freischalten";

  const bannerB = document.querySelector(".confirm-banner-text b");
  if (bannerB) bannerB.textContent = "Premium hinzugefügt! 🎉";

  const bannerText = document.querySelector(".confirm-banner-text");
  if (bannerText) {
    bannerText.childNodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
        n.textContent = " Unbegrenzte Nachrichten, Fotos und Videos — alles gehört dir.";
      }
    });
  }

  const separator = document.querySelector(".upsell-separator span");
  if (separator) separator.textContent = "Nur für dich";

  const cardHandle = document.querySelector(".card-handle");
  if (cardHandle) cardHandle.textContent = "@nour.exclusive • Exklusiver Content";

  const previewCount = document.querySelector(".preview-count");
  if (previewCount) previewCount.innerHTML = "<span>Private Kollektion</span> · mit Tokens freigeschaltet";

  const cardTitle = document.querySelector(".card-title");
  if (cardTitle) cardTitle.textContent = "Nour — Ein kleines Vergnügen unter der Dusche 🚿";

  const cardDesc = document.querySelector(".card-desc");
  if (cardDesc) cardDesc.innerHTML = `Noch außer Atem nach dem Sport, die Haut glänzend vor Schweiß und ihr Sport-BH an der Brust klebend, hat Nour dich in ihr Badezimmer gezogen. Die Dusche noch an, ging sie ohne Vorwarnung auf die Knie — die Lippen schon leicht geöffnet für dich. Sie hat dich mit diesem kleinen verschmitzten Lächeln angesehen, die Hände auf deinen Hüften, und hat dich verwöhnt, als ob sie dich leer saugen wollte. Heißes Wasser auf ihrem Gesicht, gedämpfte Lustlaute, Speichel überall… <em>Nour war hemmungslos, gierig, außer Kontrolle</em> — genau so, wie du es magst.`;

  const pillsText = [
    "🚿 DUSCH-SZENE",
    "💋 BLOWJOB",
    "😈 EXPLIZIT",
    "💦 NASS",
    "🍑 TITJOB",
    "👁️ AUGENKONTAKT",
  ];
  document.querySelectorAll(".pill").forEach((pill, i) => {
    if (pillsText[i]) pill.textContent = pillsText[i];
  });

  const bonusText = document.querySelector(".bonus-text");
  if (bonusText) {
    bonusText.innerHTML = `<b>Tokens inklusive bei deinem Kauf</b>
      Nutze sie, um den <em>Nympho-Modus</em> zu aktivieren und intimen Content mit dutzenden anderen KIs freizuschalten — bring sie an ihr Limit und mach jede Unterhaltung viel heißer 🔥`;
  }

  const unlockLabel = document.querySelector(".unlock-btn-label");
  if (unlockLabel) {
    const small = unlockLabel.querySelector("small");
    unlockLabel.textContent = "Diese Kollektion freischalten";
    if (small) {
      small.textContent = "Sofortzugang · Einmalzahlung";
      unlockLabel.appendChild(small);
    }
  }

  const testimonialTitle = document.querySelector(".testimonial-title");
  if (testimonialTitle) testimonialTitle.textContent = "Auch sie konnten nicht widerstehen 🔥";

  const testimonialsDE = [
    { text: "\"Nach dem Sport, durchgeschwitzt, auf den Knien… ich musste erstmal tief durchatmen 💀\"", author: "— Ryan T." },
    { text: "\"Dieser hungrige Blick, während das Wasser über ihr Gesicht läuft. Ich bin gestorben. Wortwörtlich. 🥵\"", author: "— Mehdi A." },
    { text: "\"Sie kommt vom Sport und legt direkt los ohne Vorwarnung. Hemmungslos im besten Sinne.\"", author: "— Tom V." },
    { text: "\"Der Titjob unter der Dusche… ich hab's mir bestimmt 6 Mal angesehen 🔁\"", author: "— Jules F." },
  ];

  document.querySelectorAll(".testimonial-card").forEach((card, i) => {
    if (!testimonialsDE[i]) return;
    const text = card.querySelector(".testimonial-text");
    const author = card.querySelector(".testimonial-author");
    if (text) text.textContent = testimonialsDE[i].text;
    if (author) author.textContent = testimonialsDE[i].author;
  });

  const faqTitle = document.querySelector(".faq-title");
  if (faqTitle) faqTitle.textContent = "Schnelle Antworten";

  const faqDE = [
    {
      q: "Was bekomme ich für 59 $?",
      a: "Vollen Zugang zu Nours exklusiver Badezimmer-Kollektion, dauerhaft freigeschaltet mit einer einzigen Zahlung — oder nutze deine Tokens für sofortigen Zugang."
    },
    {
      q: "Ist der Zugang wirklich sofort?",
      a: "Ja — sobald deine Zahlung bestätigt ist, gehört die gesamte Kollektion dir. Keine Wartezeit, kein Abo."
    },
    {
      q: "Wo finde ich meine Tokens?",
      a: "Deine Tokens findest du direkt auf deiner Profilseite. Nutze sie, um exklusiven Content mit Nour und allen anderen KIs der Plattform freizuschalten."
    },
    {
      q: "Ist meine Zahlung diskret?",
      a: "100%. Alle Transaktionen sind verschlüsselt und diskret. Die Abbuchung erscheint unter einem neutralen Namen auf deinem Kontoauszug."
    },
  ];

  document.querySelectorAll(".faq-item").forEach((item, i) => {
    if (!faqDE[i]) return;
    const btn = item.querySelector(".faq-question");
    if (btn) btn.textContent = faqDE[i].q;
    const answer = item.querySelector(".faq-answer p");
    if (answer) answer.textContent = faqDE[i].a;
  });

  const secItems = document.querySelectorAll(".security-item p");
  if (secItems[0]) secItems[0].textContent = "Sichere Zahlung";
  if (secItems[1]) secItems[1].textContent = "Volle Diskretion";
  if (secItems[2]) secItems[2].textContent = "Dauerhafter Zugang";

  const footerP = document.querySelector(".footer-links p");
  if (footerP) footerP.textContent = "© 2026 MyAICrush – Alle Rechte vorbehalten";

  document.querySelectorAll(".footer-links a").forEach(link => {
    if (link.href.includes("privacy-policy")) link.textContent = "Datenschutzrichtlinie";
    if (link.href.includes("terms-and-conditions")) link.textContent = "Allgemeine Geschäftsbedingungen";
  });

  const disclaimerBtn = document.querySelector(".disclaimer-btn");
  if (disclaimerBtn) disclaimerBtn.textContent = "+ Impressum & Zahlungssupport";

  const supportStrong = document.querySelector(".support-box strong");
  if (supportStrong) supportStrong.textContent = "Zahlungssupport & Erstattungen";

  const supportBox = document.querySelector(".support-box");
  if (supportBox) {
    const brs = supportBox.querySelectorAll("br");
    if (brs[0]?.nextSibling?.nodeType === Node.TEXT_NODE) {
      brs[0].nextSibling.textContent = " Fragen zu deiner Zahlung? Wir sind für dich da:";
    }
    const explodelyLink = supportBox.querySelector('a[href*="shorturl"]');
    if (explodelyLink) explodelyLink.textContent = "Zahlungssupport Explodely";
  }

}

if (navigator.language?.startsWith("de")) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyGermanTranslations);
  } else {
    applyGermanTranslations();
  }
}