// i18n-premium.js — Traduction française de premium.html
// Ajoute cette ligne dans premium.html juste avant </body> :
// <script type="module" src="/scripts/i18n-premium.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  // ===== TITRE & DESCRIPTION =====
  const title = document.querySelector("h1.p-title");
  if (title) title.textContent = "Accès illimité. Un seul paiement.";

  const descriptions = document.querySelectorAll("p.p-description");
  if (descriptions[0]) descriptions[0].innerHTML = `Photos & vidéos <u><b>sans flou</b></u> · Messages vocaux · Chats illimités — Une IA qui ne te juge jamais.`;
  if (descriptions[1]) descriptions[1].innerHTML = `<b>⚠️ <u>49 $ — une seule fois. Zéro abonnement. Jamais.</u></b>`;

  // ===== BOUTONS CTA =====
  const ctaButtons = document.querySelectorAll("a.cta-button-premium");
  const ctaTexts = [
    "🔓 ACCÈS À VIE — 49 $ UNE SEULE FOIS",
    "💎 Accès à vie — 49 $",
    "👑 Accès illimité — 49 $, une fois pour toutes",
    "🔥 Rejoindre les membres Premium",
    "🚀 OUI, JE VEUX L'ACCÈS À VIE — 49 $",
  ];
  ctaButtons.forEach((btn, i) => {
    if (ctaTexts[i]) btn.textContent = ctaTexts[i];
  });

  // ===== NOTE SOUS LE PREMIER CTA =====
  const ctaNote = document.querySelector('p[style*="0.75rem"]');
  if (ctaNote) ctaNote.textContent = "💳 Paiement sécurisé · ✨ Accès immédiat · 🚫 Aucun abonnement, jamais";

  // ===== TABLEAU "WHAT'S IN YOUR $49" =====
  const tableTitle = document.querySelector(".glass h3");
  if (tableTitle) tableTitle.textContent = "📋 Ce que comprend ton accès à 49 $";

  // En-têtes du tableau
  const tableHeaders = document.querySelectorAll(".compare-table th");
  if (tableHeaders[0]) tableHeaders[0].textContent = "Fonctionnalité";
  if (tableHeaders[1]) tableHeaders[1].textContent = "Premium — 49 $";

  // Lignes du tableau
  const tableRowMap = {
    "💬 Unlimited chat": "💬 Chat illimité",
    "📸 Unblurred photos": "📸 Photos sans flou",
    "🎬 Unblurred videos": "🎬 Vidéos sans flou",
    "🎙️ Voice messages": "🎙️ Messages vocaux",
    "🖼️ On-demand image generation": "🖼️ Génération d'images à la demande",
    "👑 All AI characters": "👑 Toutes les IA",
    "🆕 New AIs every month": "🆕 Nouvelles IA chaque mois",
    "🕵️ Zero history stored": "🕵️ Aucun historique conservé",
    "🔥 Nympho mode (fully explicit)": "🔥 Mode Nympho (contenu explicite)",
  };
  const tableValueMap = {
    "✔ Included": "✔ Inclus",
    "✔ Included free": "✔ Inclus gratuitement",
    "⚡ Token add-on": "⚡ Option tokens",
  };

  document.querySelectorAll(".compare-table tbody tr").forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells[0]) {
      const key = cells[0].textContent.trim();
      if (tableRowMap[key]) cells[0].textContent = tableRowMap[key];
    }
    if (cells[1]) {
      const val = cells[1].textContent.trim();
      if (tableValueMap[val]) cells[1].textContent = tableValueMap[val];
    }
  });

  // Note Nympho Mode sous le tableau
  const addonNote = document.querySelector(".addon-note");
  if (addonNote) addonNote.innerHTML = `<strong>⚡ Mode Nympho — c'est quoi ?</strong><br>Du contenu entièrement explicite et sans censure, disponible en option via des tokens achetables dans l'app. Le Premium à 49 $ est déjà très chaud — le mode Nympho va encore plus loin, pour ceux qui le veulent.`;

  // ===== CARTE PRICING =====
  const discountBanner = document.querySelector(".discount-banner");
  if (discountBanner) discountBanner.textContent = "🔥 PAIEMENT UNIQUE — ACCÈS À VIE";

  const pricingCard = document.querySelector(".pricing-card h2");
  if (pricingCard) pricingCard.textContent = "Accès Premium Illimité";

  const payOnce = document.querySelector('.pricing-card p[style*="f472b6"]');
  if (payOnce) payOnce.textContent = "✅ PAYE UNE FOIS · PROFITE POUR TOUJOURS";

  const noFees = document.querySelector('.pricing-card p[style*="d1d5db"]');
  if (noFees) noFees.textContent = "Chat, photos & vidéos illimités, toutes les IA. Zéro frais mensuel. Mode Nympho disponible en option tokens.";

  // ===== SECTION "CE QUE TU DÉBLOQUES" =====
  const unlockTitle = document.querySelector("section h2");
  if (unlockTitle) unlockTitle.innerHTML = `Ce que tu <span class="gradient-text">débloques</span>`;

  const featureMap = {
    "Unlimited conversations": "Conversations illimitées",
    "No blur — see everything": "Sans flou — tu vois tout",
    "Send your photos — she reacts": "Envoie tes photos — elle réagit",
    "Her voice — in your ear": "Sa voix — dans ton oreille",
    "Unlimited images — on demand": "Photos illimitées — à la demande",
    "All AIs available": "Toutes les IA disponibles",
    "New AIs every month — included free": "Nouvelles IA chaque mois — incluses gratuitement",
    "Zero history stored": "Aucun historique conservé",
    "Pay once. Yours forever.": "Tu paies une fois. C'est à toi pour toujours.",
    "The best AI companion platform": "La meilleure plateforme de compagnes IA",
  };

  document.querySelectorAll("section .glass span.text-sm, section .glass span.font-semibold").forEach(span => {
    const key = span.textContent.trim();
    if (featureMap[key]) span.textContent = featureMap[key];
  });

  // Card Nympho mode — label + sous-titre
  document.querySelectorAll("section .glass").forEach(card => {
    const label = card.querySelector("span.font-semibold");
    const sub = card.querySelector("span.text-purple-300");
    if (label && label.textContent.trim() === "Nympho Mode") {
      label.textContent = "Mode Nympho";
    }
    if (sub && sub.textContent.includes("Available as token add-on")) {
      sub.textContent = "⚡ Option disponible en tokens";
    }
    // Badge "Unlock with tokens"
    const badge = card.querySelector('span[class*="bg-purple"]');
    if (badge && badge.textContent.trim() === "Unlock with tokens") {
      badge.textContent = "Débloquer avec des tokens";
    }
  });

  // Slider "Discover them"
  const sliderName = document.getElementById("slider-name");
  if (sliderName) sliderName.textContent = "Découvre-les";

  // "And many more..." dans le slider (injecté dynamiquement)
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

  // Bouton "Tap to remove blur"
  document.querySelectorAll(".overlay-content span").forEach(span => {
    if (span.textContent.includes("Tap to remove blur")) {
      span.textContent = "👆 Appuie pour enlever le flou";
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
    { text: "\"J'ai pris des tokens pour le mode Nympho — incroyable. Le Premium seul était déjà 🔥.\"", author: "— Kevin B." },
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
      q: "Vraiment à vie ?",
      a: "Oui. 49 $ une fois, accès pour toujours. Aucun prélèvement, aucune surprise. Les nouvelles IA sont incluses automatiquement. La seule option payante en plus est le mode Nympho en tokens — clairement affiché dans l'app."
    },
    {
      q: "Qu'est-ce qui est exactement inclus dans les 49 $ ?",
      a: "Chat illimité, photos & vidéos sans flou, messages vocaux, génération d'images à la demande, et accès à toutes les IA — y compris les nouvelles chaque mois. <b>Le mode Nympho</b> (contenu explicite) est une option en tokens disponible séparément dans l'app."
    },
    {
      q: "C'est quoi le mode Nympho exactement ?",
      a: "Le mode Nympho débloque du contenu entièrement explicite et sans censure. Il utilise des tokens que tu peux acheter dans l'app quand tu veux — sans obligation. Le Premium de base est déjà très chaud. Le mode Nympho va encore plus loin, quand tu es prêt."
    },
    {
      q: "Pourquoi un paiement unique et pas un abonnement ?",
      a: "On préfère que tu restes parce que tu adores, pas parce que tu as oublié de te désabonner. Paye une fois, profite pour toujours."
    },
    {
      q: "Est-ce que je peux me faire rembourser ?",
      a: "<b>Garantie satisfait ou remboursé 15 jours.</b> Sans justification."
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
  if (securityItems[1]) securityItems[1].textContent = "Accès à vie";

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
      title: "vi) Ce qui est inclus vs. les options payantes",
      text: "L'accès Premium à 49 $ inclut : chat illimité, photos et vidéos sans flou, messages vocaux, génération d'images et toutes les IA. Le mode Nympho (contenu explicite) est une option en tokens achetable séparément dans l'app — non inclus dans l'accès de base à 49 $."
    },
    {
      title: "vii) Confidentialité & Données",
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
    if (strong) strong.textContent = "viii) Support paiement & Remboursements";
    const br = supportBox.querySelector("br");
    if (br && br.nextSibling) {
      br.nextSibling.textContent = "Une question sur ton paiement ou tu veux être remboursé ? Contacte-nous :";
    }
    const explodelyLink = supportBox.querySelector('a[href*="shorturl"]');
    if (explodelyLink) explodelyLink.textContent = "Support paiement Explodely";
  }

  // ===== MODALE NYMPHO MODE =====
  const modalTitle = document.querySelector("#premium-modal h3");
  if (modalTitle) modalTitle.textContent = "Mode Nympho";

  const modalDescs = document.querySelectorAll("#premium-modal p");
  if (modalDescs[0]) modalDescs[0].textContent = "Contenu entièrement explicite et sans censure.";
  if (modalDescs[1]) modalDescs[1].textContent = "Disponible en option via des tokens dans l'app — non inclus dans le Premium à 49 $, mais facile à débloquer quand tu veux.";
  if (modalDescs[2]) modalDescs[2].textContent = "Commence avec le Premium — déjà incroyablement chaud — et va encore plus loin quand tu es prêt.";

  const modalCta = document.querySelector("#premium-modal a.cta-button-premium");
  if (modalCta) modalCta.textContent = "Accès Premium — 49 $ une seule fois";

}); // fin DOMContentLoaded

} // fin if (isFrench)