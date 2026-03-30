// i18n-confirmation.js — Traduction française de confirmation.html
// Ajoute cette ligne dans confirmation.html juste avant </body> :
// <script type="module" src="/scripts/i18n-confirmation.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Débloquer le Mode Nympho";

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
  if (separator) separator.textContent = "Une dernière chose";

  // ===== NYMPHO HERO =====
  const nymphoBadge = document.querySelector(".nympho-badge-hero");
  if (nymphoBadge) nymphoBadge.textContent = "🔥 Upgrade populaire";

  const nymphoTitle = document.querySelector(".nympho-hero h2");
  if (nymphoTitle) nymphoTitle.innerHTML = `Débloquer <span>le Mode Nympho</span><br>maintenant.`;

  const nymphoDesc = document.querySelector(".nympho-hero p");
  if (nymphoDesc) nymphoDesc.innerHTML = `Le Premium te donne déjà tout le contenu chaud.<br>Mais le Mode Nympho ? C'est un autre niveau.<br>Zéro filtre. Zéro limite. Complètement sauvage. 🥵`;

  const priceBadge = document.querySelector(".nympho-hero .price-badge");
  if (priceBadge) priceBadge.textContent = "25 tokens = 1 heure de Mode Nympho";

  // ===== BENEFITS GRID =====
  const benefitItems = document.querySelectorAll(".benefit-grid .benefit-item");
  const benefitsFR = [
    { title: "Mode Nympho", sub: "25 tokens / 1 heure" },
    { title: "Appel audio", sub: "20 tokens / 10 min" },
    { title: "Message vocal", sub: "5 tokens / 1 min" },
    { title: "Envoyer une photo", sub: "1 token / image" },
  ];
  benefitItems.forEach((item, i) => {
    if (!benefitsFR[i]) return;
    const b = item.querySelector("span b");
    const span = item.querySelector("span");
    if (b) b.textContent = benefitsFR[i].title;
    if (span) {
      // Remplace le texte après le <b>
      const textNode = [...span.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = benefitsFR[i].sub;
    }
  });

  // ===== NYMPHO REMINDER =====
  const reminder = document.querySelector(".nympho-reminder span");
  if (reminder) reminder.innerHTML = `Le pack 10 tokens ne suffit pas pour le Mode Nympho. Pour l'activer, il te faut <b>au moins 25 tokens</b> — prends le pack 50 et active-le deux fois.`;

  // ===== TOKEN CARDS — BOUTONS & BADGES =====
  document.querySelectorAll(".token-cta").forEach(btn => {
    if (btn.textContent.trim() === "Buy") btn.textContent = "Acheter";
    if (btn.textContent.trim() === "Get this deal") btn.textContent = "Profiter de l'offre";
  });

  document.querySelectorAll(".token-save").forEach(badge => {
    badge.textContent = badge.textContent
      .replace("Save 17%", "−17%")
      .replace("Save 34%", "−34%")
      .replace("Save 52% 🔥", "−52% 🔥")
      .replace("Save 60%", "−60%")
      .replace("Save 66%", "−66%");
  });

  const bestDeal = document.querySelector(".best-deal");
  if (bestDeal) bestDeal.textContent = "MEILLEURE OFFRE 💎";

  // ===== POPUP DE CONFIRMATION =====
  const popupTitle = document.querySelector(".popup-title");
  if (popupTitle) popupTitle.textContent = "Confirmer ta commande ?";

  // On traduit UNIQUEMENT les noeuds texte autour des spans dynamiques
  // sans toucher à #confirm-tokens et #confirm-price (mis à jour par le JS original)
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

  // ===== TÉMOIGNAGES =====
  const testimonialTitle = document.querySelector(".testimonial-title");
  if (testimonialTitle) testimonialTitle.textContent = "Ils ont pris des tokens. Ils sont devenus accros. 🔥";

  const testimonials = [
    { text: "\"Léa en mode nympho… c'est une autre fille. J'étais vraiment pas prêt 🔥\"", author: "— Karim M." },
    { text: "\"Jasmine était toute douce au début… et puis boom. Plus rien dessus. J'en revenais pas 😳\"", author: "— Lucas R." },
    { text: "\"25 tokens pour le mode nympho ? C'est donné. Elle est partie en live direct 😈\"", author: "— Steph G." },
    { text: "\"Je pensais que c'était du flan. C'est pas du flan 😭 Photos non-stop. Impossible d'arrêter.\"", author: "— Bast D." },
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
      q: "C'est quoi le Mode Nympho ?",
      a: "Ton IA lâche tout — plus osée, plus de photos, zéro limite. Même les plus timides se transforment complètement."
    },
    {
      q: "Combien de tokens pour l'activer ?",
      a: "25 tokens = 1 heure de Mode Nympho. Fonctionne avec toutes les IA, autant de fois que tu veux."
    },
    {
      q: "Les tokens expirent-ils ?",
      a: "Jamais. Utilise-les quand tu veux, à ton rythme."
    },
    {
      q: "À quoi d'autre servent les tokens ?",
      a: "📸 Photos de galerie · 🎙️ Messages vocaux · 📞 Appels audio · 🥵 Mode Nympho"
    },
  ];

  document.querySelectorAll(".faq-item").forEach((item, i) => {
    if (!faqItems[i]) return;
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer p");
    if (question) question.textContent = faqItems[i].q;
    if (answer) answer.innerHTML = faqItems[i].a;
  });

  // ===== SÉCURITÉ =====
  const securityItems = document.querySelectorAll(".security-item p");
  if (securityItems[0]) securityItems[0].textContent = "100% Sécurisé";
  if (securityItems[1]) securityItems[1].textContent = "Confidentialité totale";
  if (securityItems[2]) securityItems[2].textContent = "Tokens sans expiration";

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
    const br = supportBox.querySelector("br");
    if (br && br.nextSibling) {
      br.nextSibling.textContent = "Une question sur ton paiement ? On est là :";
    }
    const explodelyLink = supportBox.querySelector('a[href*="shorturl"]');
    if (explodelyLink) explodelyLink.textContent = "Support paiement Explodely";
  }

}); // fin DOMContentLoaded

} // fin if (isFrench)

const isGerman = navigator.language?.startsWith("de");

if (isGerman) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Nympho-Modus freischalten";

  const bannerText = document.querySelector(".confirm-banner-text");
  if (bannerText) {
    const b = bannerText.querySelector("b");
    if (b) b.textContent = "Premium freigeschaltet! 🎉";
    const textNode = [...bannerText.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (textNode) textNode.textContent = "Unbegrenzte Nachrichten, Fotos und Videos — alles gehört dir.";
  }

  const separator = document.querySelector(".upsell-separator span");
  if (separator) separator.textContent = "Noch eine Sache";

  const nymphoBadge = document.querySelector(".nympho-badge-hero");
  if (nymphoBadge) nymphoBadge.textContent = "🔥 Beliebtes Upgrade";

  const nymphoTitle = document.querySelector(".nympho-hero h2");
  if (nymphoTitle) nymphoTitle.innerHTML = `<span>Nympho-Modus</span><br>jetzt freischalten.`;

  const nymphoDesc = document.querySelector(".nympho-hero p");
  if (nymphoDesc) nymphoDesc.innerHTML = `Premium gibt dir schon alles an heißem Content.<br>Aber der Nympho-Modus? Das ist ein anderes Level.<br>Kein Filter. Keine Grenzen. Komplett hemmungslos. 🥵`;

  const priceBadge = document.querySelector(".nympho-hero .price-badge");
  if (priceBadge) priceBadge.textContent = "25 Tokens = 1 Stunde Nympho-Modus";

  const benefitItems = document.querySelectorAll(".benefit-grid .benefit-item");
  const benefitsDE = [
    { title: "Nympho-Modus", sub: "25 Tokens / 1 Stunde" },
    { title: "Audio-Anruf", sub: "20 Tokens / 10 Min" },
    { title: "Sprachnachricht", sub: "5 Tokens / 1 Min" },
    { title: "Foto senden", sub: "1 Token / Bild" },
  ];
  benefitItems.forEach((item, i) => {
    if (!benefitsDE[i]) return;
    const b = item.querySelector("span b");
    const span = item.querySelector("span");
    if (b) b.textContent = benefitsDE[i].title;
    if (span) {
      const textNode = [...span.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = benefitsDE[i].sub;
    }
  });

  const reminder = document.querySelector(".nympho-reminder span");
  if (reminder) reminder.innerHTML = `Das 10-Token-Paket reicht nicht für den Nympho-Modus. Dafür brauchst du <b>mindestens 25 Tokens</b> — nimm das 50er-Paket und aktiviere ihn zweimal.`;

  document.querySelectorAll(".token-cta").forEach(btn => {
    if (btn.textContent.trim() === "Buy") btn.textContent = "Kaufen";
    if (btn.textContent.trim() === "Get this deal") btn.textContent = "Angebot sichern";
  });

  document.querySelectorAll(".token-save").forEach(badge => {
    badge.textContent = badge.textContent
      .replace("Save 17%", "−17%")
      .replace("Save 34%", "−34%")
      .replace("Save 52% 🔥", "−52% 🔥")
      .replace("Save 60%", "−60%")
      .replace("Save 66%", "−66%");
  });

  const bestDeal = document.querySelector(".best-deal");
  if (bestDeal) bestDeal.textContent = "BESTES ANGEBOT 💎";

  const popupTitle = document.querySelector(".popup-title");
  if (popupTitle) popupTitle.textContent = "Bestellung bestätigen?";

  const popupText = document.querySelector(".popup-text");
  if (popupText) {
    popupText.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = node.textContent
          .replace("You're buying", "Du kaufst")
          .replace("for", "für");
      }
    });
  }

  const btnCancel = document.querySelector(".btn-cancel");
  if (btnCancel) btnCancel.textContent = "Abbrechen";

  const btnConfirm = document.querySelector(".btn-confirm");
  if (btnConfirm) btnConfirm.textContent = "Bestätigen ✓";

  const testimonialTitle = document.querySelector(".testimonial-title");
  if (testimonialTitle) testimonialTitle.textContent = "Sie haben sich Tokens geholt. Jetzt sind sie süchtig. 🔥";

  const testimonials = [
    { text: "\"Léa im Nympho-Modus… das ist ein komplett anderes Mädchen. Ich war echt nicht bereit 🔥\"", author: "— Karim M." },
    { text: "\"Jasmine war am Anfang total süß… und dann boom. Nichts mehr an. Ich konnte es nicht glauben 😳\"", author: "— Lucas R." },
    { text: "\"25 Tokens für den Nympho-Modus? Das ist geschenkt. Sie hat direkt komplett losgelegt 😈\"", author: "— Steph G." },
    { text: "\"Ich dachte, das wäre übertrieben. Ist es nicht 😭 Fotos nonstop. Unmöglich aufzuhören.\"", author: "— Bast D." },
  ];

  document.querySelectorAll(".testimonial-card").forEach((card, i) => {
    if (!testimonials[i]) return;
    const text = card.querySelector(".testimonial-text");
    const author = card.querySelector(".testimonial-author");
    if (text) text.textContent = testimonials[i].text;
    if (author) author.textContent = testimonials[i].author;
  });

  const faqTitle = document.querySelector(".faq-title");
  if (faqTitle) faqTitle.textContent = "Schnelle Antworten";

  const faqItems = [
    {
      q: "Was ist der Nympho-Modus?",
      a: "Deine KI lässt alles los — freizügiger, mehr Fotos, keine Grenzen. Selbst die Schüchternsten verwandeln sich komplett."
    },
    {
      q: "Wie viele Tokens brauche ich?",
      a: "25 Tokens = 1 Stunde Nympho-Modus. Funktioniert mit allen KIs, so oft du willst."
    },
    {
      q: "Laufen die Tokens ab?",
      a: "Niemals. Nutze sie wann du willst, in deinem eigenen Tempo."
    },
    {
      q: "Wofür kann ich Tokens noch verwenden?",
      a: "📸 Galerie-Fotos · 🎙️ Sprachnachrichten · 📞 Audio-Anrufe · 🥵 Nympho-Modus"
    },
  ];

  document.querySelectorAll(".faq-item").forEach((item, i) => {
    if (!faqItems[i]) return;
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer p");
    if (question) question.textContent = faqItems[i].q;
    if (answer) answer.innerHTML = faqItems[i].a;
  });

  const securityItems = document.querySelectorAll(".security-item p");
  if (securityItems[0]) securityItems[0].textContent = "100% Sicher";
  if (securityItems[1]) securityItems[1].textContent = "Volle Diskretion";
  if (securityItems[2]) securityItems[2].textContent = "Tokens ohne Ablaufdatum";

  const footerCopyright = document.querySelector(".footer-links p");
  if (footerCopyright) footerCopyright.textContent = "© 2026 MyAICrush – Alle Rechte vorbehalten";

  document.querySelectorAll(".footer-links a").forEach(link => {
    if (link.href.includes("privacy-policy")) link.textContent = "Datenschutzrichtlinie";
    if (link.href.includes("terms-and-conditions")) link.textContent = "Allgemeine Geschäftsbedingungen";
  });

  const disclaimerBtn = document.querySelector(".disclaimer-btn");
  if (disclaimerBtn) disclaimerBtn.textContent = "+ Impressum & Zahlungssupport";

  const supportBox = document.querySelector(".support-box");
  if (supportBox) {
    const strong = supportBox.querySelector("strong");
    if (strong) strong.textContent = "Zahlungssupport & Erstattungen";
    const br = supportBox.querySelector("br");
    if (br && br.nextSibling) {
      br.nextSibling.textContent = "Fragen zu deiner Zahlung? Wir sind für dich da:";
    }
    const explodelyLink = supportBox.querySelector('a[href*="shorturl"]');
    if (explodelyLink) explodelyLink.textContent = "Zahlungssupport Explodely";
  }

}); // fin DOMContentLoaded

} // fin if (isGerman)