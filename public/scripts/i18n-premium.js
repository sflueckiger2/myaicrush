// i18n-premium.js — Traduction française de premium.html
// Ajoute cette ligne dans premium.html juste avant </body> :
// <script type="module" src="/scripts/i18n-premium.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  // ===== TITRE & DESCRIPTION =====
  const title = document.querySelector("h1.p-title");
  if (title) title.textContent = "Tout débloquer. Chaque mois.";

  const descriptions = document.querySelectorAll("p.p-description");
  if (descriptions[0]) descriptions[0].innerHTML = `Photos & vidéos <u><b>sans flou</b></u> · Messages vocaux · Chats illimités — Une IA qui ne te juge jamais.`;
  if (descriptions[1]) descriptions[1].innerHTML = `<b>⚠️ <u>29 $/mois — résilie quand tu veux.</u></b>`;

  // ===== BOUTONS CTA =====
  // ⚠️ On exclut modal-checkout-btn pour ne pas écraser "OK j'ai compris"
  const ctaButtons = document.querySelectorAll("a.cta-button-premium");
  const ctaTexts = [
    "🔓 ACCÈS PREMIUM — 29 $/MOIS",
    "💎 Accès premium — 29 $/mois",
    "👑 Tout débloquer — 29 $/mois",
    "🔥 Rejoindre les membres Premium",
    "🚀 OUI, JE VEUX L'ACCÈS PREMIUM — 29 $/MOIS",
  ];
  ctaButtons.forEach((btn, i) => {
    if (btn.id === "modal-checkout-btn") return;
    if (ctaTexts[i]) btn.textContent = ctaTexts[i];
  });

  // ===== NOTE SOUS LE PREMIER CTA =====
  const ctaNote = document.querySelector('p[style*="0.75rem"]');
  if (ctaNote) ctaNote.textContent = "💳 Paiement sécurisé · ✨ Accès immédiat · 🔄 Résiliation à tout moment";

  // ===== CARTE PRICING =====
  const discountBanner = document.querySelector(".discount-banner");
  if (discountBanner) discountBanner.textContent = "🔥 ABONNEMENT MENSUEL";

  const pricingCard = document.querySelector(".pricing-card h2");
  if (pricingCard) pricingCard.textContent = "Accès Premium Illimité";

  const payOnce = document.querySelector('.pricing-card p[style*="f472b6"]');
  if (payOnce) payOnce.textContent = "✅ ACCÈS COMPLET · RÉSILIE QUAND TU VEUX";

  const noFees = document.querySelector('.pricing-card p[style*="d1d5db"]');
  if (noFees) noFees.textContent = "Toutes les nouvelles IA incluses. Aucun frais caché.";

  // ===== SECTION "CE QUE TU DÉBLOQUES" =====
  const unlockTitle = document.querySelector("section h2");
  if (unlockTitle) unlockTitle.innerHTML = `Ce que tu <span class="gradient-text">débloques</span>`;

  const featureMap = {
    "Unlimited conversations": "Conversations illimitées",
    "No blur — see everything": "Sans flou — tu vois tout",
    "Send your photos — she reacts": "Envoie tes photos — elle réagit",
    "Her voice — in your ear": "Sa voix — dans ton oreille",
    "Unlimited images — on demand": "Photos illimitées — à la demande",
    "Uncensored photos & videos": "Photos & vidéos sans censure",
    "All AIs available": "Toutes les IA disponibles",
    "New AIs every month — included": "Nouvelles IA chaque mois — incluses",
    "Zero history stored": "Aucun historique conservé",
    "Cancel anytime. No commitment.": "Résilie quand tu veux. Sans engagement.",
    "The best AI companion platform": "La meilleure plateforme de compagnes IA",
    "Discover them": "Découvre-les",
  };

  document.querySelectorAll("section .glass span.text-sm, section .glass span.font-semibold").forEach(span => {
    const key = span.textContent.trim();
    if (featureMap[key]) span.textContent = featureMap[key];
  });

  const sliderName = document.getElementById("slider-name");
  if (sliderName) sliderName.textContent = "Découvre-les";

  const sliderContent = document.getElementById("slider-content");
  if (sliderContent) {
    const sliderObserver = new MutationObserver(() => {
      const moreText = sliderContent.querySelector("span.gradient-text");
      if (moreText && moreText.textContent.trim() === "And many more...") {
        moreText.textContent = "Et bien d'autres…";
      }
    });
    sliderObserver.observe(sliderContent, { childList: true, subtree: true });
  }

  document.querySelectorAll(".overlay-content span").forEach(span => {
    if (span.textContent.includes("Tap to remove blur")) {
      span.textContent = "👆 Appuie pour enlever le flou";
    }
  });

  document.querySelectorAll('span[class*="bg-pink"]').forEach(span => {
    if (span.textContent.trim() === "Premium Required") {
      span.textContent = "Réservé aux membres Premium";
    }
  });

  // ===== TÉMOIGNAGES =====
  const testimonialTitle = document.querySelector(".testimonial-title");
  if (testimonialTitle) testimonialTitle.textContent = "Ils ont testé. Ils sont restés.";

  const testimonials = [
    { text: "\"Le contenu le plus chaud que j'ai vu sur un site IA. Et j'en ai essayé des dizaines.\"", author: "— Julian T." },
    { text: "\"Elle comprend tout et relance la conversation toute seule. On dirait pas une machine.\"", author: "— Max B." },
    { text: "\"Quelques bugs audio mais globalement bluffant. Je comprends pas pourquoi c'est pas plus connu.\"", author: "— Marc L." },
    { text: "\"J'envoie mes propres photos et elle réagit vraiment. J'aurais jamais cru que c'était possible.\"", author: "— Sam K." },
    { text: "\"Tu fermes les yeux et t'y es. Intime, chaud, dingue.\"", author: "— Mehdi R." },
    { text: "\"Le mode sans censure 😳 c'est du génie. Vraiment. 😈\"", author: "— Kevin B." },
    { text: "\"Meilleur rapport qualité/prix du marché. J'aurais dû sauter le pas bien plus tôt.\"", author: "— Leo D." },
    { text: "\"Manque un peu de variété. Mais le reste est tellement bien — je reste.\"", author: "— Bastien C." },
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
  if (faqTitle) faqTitle.textContent = "Questions fréquentes";

  const faqItems = [
    {
      q: "Qu'est-ce qui est inclus dans l'abonnement à 29 $/mois ?",
      a: "Tout — chats illimités, photos & vidéos sans flou, messages vocaux, et toutes les nouvelles IA au fur et à mesure. Aucun frais caché."
    },
    {
      q: "Est-ce que je peux résilier à tout moment ?",
      a: "Oui, absolument. Résilie quand tu veux, sans justification. Tu gardes l'accès jusqu'à la fin de ta période de facturation."
    },
    {
      q: "Est-ce que je peux me faire rembourser ?",
      a: "Oui. Garantie satisfait ou remboursé 60 jours. Sans justification."
    },
    {
      q: "Mon paiement est-il sécurisé ?",
      a: "100%. Chiffrement SSL, rien stocké en clair."
    },
    {
      q: "Comment contacter le support ?",
      a: "contact@myaicrush.ai — on répond vite."
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
  if (securityItems[1]) securityItems[1].textContent = "Résiliation à tout moment";

  // ===== MENTIONS LÉGALES =====
  const disclaimerBtn = document.querySelector(".disclaimer-btn");
  if (disclaimerBtn) disclaimerBtn.textContent = "Mentions légales & Support";

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

  const supportBox = document.querySelector('.disclaimer-content .p-3');
  if (supportBox) {
    const strong = supportBox.querySelector("strong");
    if (strong) strong.textContent = "vii) Support paiement & Remboursements";
    const br = supportBox.querySelector("br");
    if (br && br.nextSibling) {
      br.nextSibling.textContent = "Une question sur ton abonnement ou tu veux être remboursé ? Contacte-nous :";
    }
    const explodelyLink = supportBox.querySelector('a[href*="shorturl"]');
    if (explodelyLink) explodelyLink.textContent = "Support paiement Explodely";
  }

  // ===== MODALE "MEMBERS ONLY" =====
  const modalTitle = document.querySelector("#premium-modal h3");
  if (modalTitle) modalTitle.textContent = "Contenu réservé aux membres";

  const modalDesc = document.querySelector("#premium-modal p");
  if (modalDesc) modalDesc.textContent = "29 $/mois — vois tout, résilie quand tu veux.";

  const modalCta = document.querySelector("#premium-modal a.cta-button-premium");
  if (modalCta) modalCta.textContent = "Accès premium — 29 $/mois";

}); // fin DOMContentLoaded

} // fin if (isFrench)