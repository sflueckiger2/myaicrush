// i18n-premium.js — Traduction française de premium.html
// Ajoute cette ligne dans premium.html juste avant </body> :
// <script type="module" src="/scripts/i18n-premium.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Premium – MyAiCrush";

  // ===== TITRE & DESCRIPTION =====
  const title = document.querySelector("h1.p-title");
  if (title) title.textContent = "Tout débloquer. Sans limites.";

  const descriptions = document.querySelectorAll("p.p-description");
  if (descriptions[0]) descriptions[0].innerHTML = `Photos & vidéos <u><b>sans flou</b></u> · Messages vocaux · Chats illimités — Une IA qui ne te juge jamais.`;
  if (descriptions[1]) descriptions[1].innerHTML = `<b>⚠️ <u>Choisis ton plan — résilie quand tu veux.</u></b>`;

  // ===== PLAN CARDS =====
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const map = {
      "hero-price": "Choisis ton plan — résilie quand tu veux.",
      "plan-monthly-label": "Mensuel",
      "plan-monthly-per": "/mois",
      "plan-monthly-billed": "Facturé mensuellement",
      "plan-monthly-btn": "Choisir mensuel",
      "plan-annual-badge": "🔥 Meilleur prix",
      "plan-annual-label": "Annuel",
      "plan-annual-old-price": "29 $/mois",
      "plan-annual-per": "/mois",
      "plan-annual-save": "ÉCONOMISE 74%",
      "plan-annual-monthly": "Facturé 89 $/an",
      "plan-annual-btn": "🔓 ACCÈS ANNUEL",
      "cta-annual-mid": "👑 Accès annuel — 89 $/an (économise 74%)",
      "cta-monthly-mid": "Ou 29 $/mois",
      "cta-annual-testi": "🔥 Devenir Premium — 89 $/an (-74%)",
      "cta-monthly-testi": "Ou 29 $/mois",
      "cta-final-sub": "",
      "modal-desc": "Dès 7,42 $/mois — vois tout, résilie quand tu veux.",
      "modal-cta": "Accès annuel — 89 $/an",
      "modal-monthly": "Ou 29 $/mois",
    };
    if (map[key] !== undefined) {
      if (key === "cta-final-sub") {
        el.innerHTML = `Soit seulement 7,42 $/mois · <a href="https://explodely.com/p/22705532" style="color:#9ca3af; text-decoration:underline;">Ou 29 $/mois</a>`;
      } else {
        el.textContent = map[key];
      }
    }
  });

  // ===== BOUTONS CTA (big final) =====
  const bigFinalCta = document.querySelector('.px-4.mb-12 a.cta-button-premium');
  if (bigFinalCta) bigFinalCta.textContent = "🚀 OUI, JE VEUX L'ACCÈS — 89 $/AN";

  // ===== NOTE SOUS LE PREMIER CTA =====
  const ctaNote = document.querySelector('p[style*="0.75rem"]');
  if (ctaNote && !ctaNote.hasAttribute('data-i18n')) ctaNote.textContent = "💳 Paiement sécurisé · ✨ Accès immédiat · 🔄 Résiliation à tout moment";

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
    "30 free tokens every month — included with Premium": "30 jetons gratuits chaque mois — inclus avec le Premium",
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
      q: "Quels sont les plans disponibles ?",
      a: "Deux plans : <b>Annuel à 89 $/an</b> (7,42 $/mois — économise 74%) ou <b>Mensuel à 29 $/mois</b>. Les deux incluent tout — chats illimités, photos & vidéos sans flou, messages vocaux et toutes les nouvelles IA. Aucun frais caché."
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

  // ===== MODALE "MEMBERS ONLY" - handled by data-i18n above =====

  // Video Creator promo
  const vcTitle = document.querySelector(".vc-promo-title");
  if (vcTitle) vcTitle.textContent = "Crée une Vidéo de ton Crush";
  const vcDesc = document.querySelector(".vc-promo-desc");
  if (vcDesc) vcDesc.textContent = "Uploade n'importe quelle photo et notre IA la transforme en une vidéo de 10 secondes. Ultra HD ou sans censure — à toi de choisir.";
  const vcBtn = document.querySelector(".vc-promo-btn");
  if (vcBtn) vcBtn.textContent = "🎥 Essayer le Video Creator";
  const vcCost = document.querySelector(".vc-promo-cost");
  if (vcCost) vcCost.textContent = "9 jetons par vidéo";

  const vcBenefit = document.querySelector(".vc-benefit-text");
  if (vcBenefit) { vcBenefit.textContent = "Crée des vidéos de ton crush à partir d'une photo"; vcBenefit.style.background = "linear-gradient(90deg,#f472b6,#a855f7)"; vcBenefit.style.webkitBackgroundClip = "text"; vcBenefit.style.webkitTextFillColor = "transparent"; }

}); // fin DOMContentLoaded

} // fin if (isFrench)

const isGerman = navigator.language?.startsWith("de");

if (isGerman) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Premium – MyAiCrush";

  // ===== TITEL & BESCHREIBUNG =====
  const title = document.querySelector("h1.p-title");
  if (title) title.textContent = "Alles freischalten. Ohne Limits.";

  const descriptions = document.querySelectorAll("p.p-description");
  if (descriptions[0]) descriptions[0].innerHTML = `Fotos & Videos <u><b>unzensiert</b></u> · Sprachnachrichten · Unbegrenzte Chats — Eine KI, die dich niemals verurteilt.`;
  if (descriptions[1]) descriptions[1].innerHTML = `<b>⚠️ <u>Wähle deinen Plan — jederzeit kündbar.</u></b>`;

  // ===== PLAN CARDS =====
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const map = {
      "hero-price": "Wähle deinen Plan — jederzeit kündbar.",
      "plan-monthly-label": "Monatlich",
      "plan-monthly-per": "/Monat",
      "plan-monthly-billed": "Monatlich abgerechnet",
      "plan-monthly-btn": "Monatlich wählen",
      "plan-annual-badge": "🔥 Bestes Angebot",
      "plan-annual-label": "Jährlich",
      "plan-annual-old-price": "29 $/Monat",
      "plan-annual-per": "/Monat",
      "plan-annual-save": "SPARE 74%",
      "plan-annual-monthly": "89 $/Jahr abgerechnet",
      "plan-annual-btn": "🔓 JAHRESZUGANG",
      "cta-annual-mid": "👑 Jahreszugang — 89 $/Jahr (spare 74%)",
      "cta-monthly-mid": "Oder 29 $/Monat",
      "cta-annual-testi": "🔥 Premium werden — 89 $/Jahr (-74%)",
      "cta-monthly-testi": "Oder 29 $/Monat",
      "cta-final-sub": "",
      "modal-desc": "Ab 7,42 $/Monat — sieh alles, jederzeit kündbar.",
      "modal-cta": "Jahreszugang — 89 $/Jahr",
      "modal-monthly": "Oder 29 $/Monat",
    };
    if (map[key] !== undefined) {
      if (key === "cta-final-sub") {
        el.innerHTML = `Das sind nur 7,42 $/Monat · <a href="https://explodely.com/p/22705532" style="color:#9ca3af; text-decoration:underline;">Oder 29 $/Monat</a>`;
      } else {
        el.textContent = map[key];
      }
    }
  });

  const bigFinalCta = document.querySelector('.px-4.mb-12 a.cta-button-premium');
  if (bigFinalCta) bigFinalCta.textContent = "🚀 JA, ICH WILL PREMIUM — 89 $/JAHR";

  // ===== HINWEIS UNTER ERSTEM CTA =====
  const ctaNote = document.querySelector('p[style*="0.75rem"]');
  if (ctaNote && !ctaNote.hasAttribute('data-i18n')) ctaNote.textContent = "💳 Sichere Zahlung · ✨ Sofortiger Zugang · 🔄 Jederzeit kündbar";

  // ===== ABSCHNITT "WAS DU FREISCHALTEST" =====
  const unlockTitle = document.querySelector("section h2");
  if (unlockTitle) unlockTitle.innerHTML = `Was du <span class="gradient-text">freischaltest</span>`;

  const featureMap = {
    "Unlimited conversations": "Unbegrenzte Gespräche",
    "No blur — see everything": "Kein Blur — sieh alles",
    "Send your photos — she reacts": "Schick deine Fotos — sie reagiert",
    "Her voice — in your ear": "Ihre Stimme — in deinem Ohr",
    "Unlimited images — on demand": "Unbegrenzte Bilder — auf Abruf",
    "Uncensored photos & videos": "Fotos & Videos unzensiert",
    "All AIs available": "Alle KIs verfügbar",
    "New AIs every month — included": "Neue KIs jeden Monat — inklusive",
    "30 free tokens every month — included with Premium": "30 Gratis-Tokens jeden Monat — im Premium inklusive",
    "Zero history stored": "Kein Verlauf gespeichert",
    "Cancel anytime. No commitment.": "Jederzeit kündbar. Ohne Bindung.",
    "The best AI companion platform": "Die beste KI-Begleiterinnen-Plattform",
    "Discover them": "Entdecke sie",
  };

  document.querySelectorAll("section .glass span.text-sm, section .glass span.font-semibold").forEach(span => {
    const key = span.textContent.trim();
    if (featureMap[key]) span.textContent = featureMap[key];
  });

  const sliderName = document.getElementById("slider-name");
  if (sliderName) sliderName.textContent = "Entdecke sie";

  const sliderContent = document.getElementById("slider-content");
  if (sliderContent) {
    const sliderObserver = new MutationObserver(() => {
      const moreText = sliderContent.querySelector("span.gradient-text");
      if (moreText && moreText.textContent.trim() === "And many more...") {
        moreText.textContent = "Und viele mehr…";
      }
    });
    sliderObserver.observe(sliderContent, { childList: true, subtree: true });
  }

  document.querySelectorAll(".overlay-content span").forEach(span => {
    if (span.textContent.includes("Tap to remove blur")) {
      span.textContent = "👆 Tippe, um den Blur zu entfernen";
    }
  });

  document.querySelectorAll('span[class*="bg-pink"]').forEach(span => {
    if (span.textContent.trim() === "Premium Required") {
      span.textContent = "Nur für Premium-Mitglieder";
    }
  });

  // ===== ERFAHRUNGSBERICHTE =====
  const testimonialTitle = document.querySelector(".testimonial-title");
  if (testimonialTitle) testimonialTitle.textContent = "Sie haben's getestet. Sie sind geblieben.";

  const testimonials = [
    { text: "\"Der heißeste Content, den ich je auf einer KI-Seite gesehen hab. Und ich hab dutzende ausprobiert.\"", author: "— Lukas T." },
    { text: "\"Sie versteht alles und führt das Gespräch von alleine weiter. Fühlt sich nicht wie eine Maschine an.\"", author: "— Maximilian B." },
    { text: "\"Ein paar Audio-Bugs, aber insgesamt unfassbar gut. Versteh nicht, warum das nicht bekannter ist.\"", author: "— Marco L." },
    { text: "\"Ich schick meine eigenen Fotos und sie reagiert wirklich darauf. Hätte nie gedacht, dass das möglich ist.\"", author: "— Stefan K." },
    { text: "\"Augen zu und du bist mittendrin. Intim, heiß, der Wahnsinn.\"", author: "— Mehmet R." },
    { text: "\"Der unzensierte Modus 😳 ist genial. Wirklich. 😈\"", author: "— Kevin B." },
    { text: "\"Bestes Preis-Leistungs-Verhältnis auf dem Markt. Hätte viel früher zuschlagen sollen.\"", author: "— Leon D." },
    { text: "\"Etwas mehr Abwechslung wäre nice. Aber der Rest ist so gut — ich bleib.\"", author: "— Bastian C." },
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
  if (faqTitle) faqTitle.textContent = "Häufig gestellte Fragen";

  const faqItems = [
    {
      q: "Welche Pläne gibt es?",
      a: "Zwei Pläne: <b>Jährlich für 89 $/Jahr</b> (7,42 $/Monat — spare 74%) oder <b>Monatlich für 29 $/Monat</b>. Beide beinhalten alles — unbegrenzte Chats, Fotos & Videos unzensiert, Sprachnachrichten und alle neuen KIs. Keine versteckten Kosten."
    },
    {
      q: "Kann ich jederzeit kündigen?",
      a: "Ja, absolut. Kündige wann du willst, ohne Angabe von Gründen. Du behältst den Zugang bis zum Ende deines Abrechnungszeitraums."
    },
    {
      q: "Kann ich mein Geld zurückbekommen?",
      a: "Ja. 60 Tage Geld-zurück-Garantie. Ohne Angabe von Gründen."
    },
    {
      q: "Ist meine Zahlung sicher?",
      a: "100%. SSL-Verschlüsselung, nichts wird im Klartext gespeichert."
    },
    {
      q: "Wie erreiche ich den Support?",
      a: "contact@myaicrush.ai — wir antworten schnell."
    },
  ];

  document.querySelectorAll(".faq-item").forEach((item, i) => {
    if (!faqItems[i]) return;
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer p");
    if (question) question.textContent = faqItems[i].q;
    if (answer) answer.innerHTML = faqItems[i].a;
  });

  // ===== SICHERHEIT =====
  const securityItems = document.querySelectorAll(".security-item p");
  if (securityItems[0]) securityItems[0].textContent = "100% Sicher";
  if (securityItems[1]) securityItems[1].textContent = "Jederzeit kündbar";

  // ===== IMPRESSUM & RECHTLICHES =====
  const disclaimerBtn = document.querySelector(".disclaimer-btn");
  if (disclaimerBtn) disclaimerBtn.textContent = "Impressum & Zahlungssupport";

  const legalDE = [
    {
      title: "i) Altersbeschränkung (Pflichthinweis)",
      text: "Diese Seite ist ausschließlich für Erwachsene ab 18 Jahren (in manchen Ländern ab 21 Jahren). Mit dem Zugriff auf diese Seite bestätigst du, dass du das erforderliche Alter erreicht hast. Der Zugang für Minderjährige ist strengstens untersagt."
    },
    {
      title: "ii) KI-generierter Inhalt",
      text: "Alle Charaktere und Gespräche werden durch künstliche Intelligenz erzeugt. Keine echten Personen sind beteiligt. Alle Charaktere sind vollständig fiktiv. Jede Ähnlichkeit mit realen Personen ist rein zufällig."
    },
    {
      title: "iii) Verbotene Inhalte",
      text: "Jegliche Inhalte, die Minderjährige, nicht einvernehmliche Handlungen oder illegale Aktivitäten beinhalten, sind strengstens verboten. Alle Interaktionen werden moderiert und gefiltert."
    },
    {
      title: "iv) Nutzergenerierte Inhalte",
      text: "Nutzer können Bilder in Gespräche senden. Diese Bilder dürfen weder verändert noch weiterverbreitet werden. Inhalte, die gegen unsere Richtlinien verstoßen, werden entfernt und können zur Sperrung des Kontos führen."
    },
    {
      title: "v) Nur zur Unterhaltung",
      text: "Diese Plattform dient ausschließlich der Unterhaltung. Es werden keine professionellen Ratschläge (rechtlich, medizinisch, finanziell oder psychologisch) erteilt."
    },
    {
      title: "vi) Datenschutz & Daten",
      text: "Gespräche können zu Moderations- und Qualitätszwecken aufgezeichnet werden. Deine Daten werden gemäß unserer Datenschutzrichtlinie verarbeitet. Wir verkaufen deine persönlichen Daten nicht."
    },
  ];

  document.querySelectorAll(".disclaimer-content .mb-4").forEach((block, i) => {
    if (!legalDE[i]) return;
    const strong = block.querySelector("strong");
    if (strong) strong.textContent = legalDE[i].title;
    const br = block.querySelector("br");
    if (br && br.nextSibling) br.nextSibling.textContent = legalDE[i].text;
  });

  const supportBox = document.querySelector('.disclaimer-content .p-3');
  if (supportBox) {
    const strong = supportBox.querySelector("strong");
    if (strong) strong.textContent = "vii) Zahlungssupport & Erstattungen";
    const br = supportBox.querySelector("br");
    if (br && br.nextSibling) {
      br.nextSibling.textContent = "Frage zu deinem Abo oder du möchtest eine Erstattung? Kontaktiere uns:";
    }
    const explodelyLink = supportBox.querySelector('a[href*="shorturl"]');
    if (explodelyLink) explodelyLink.textContent = "Zahlungssupport Explodely";
  }

  // ===== MODAL "NUR FÜR MITGLIEDER" - handled by data-i18n above =====

  // Video Creator promo
  const vcTitle = document.querySelector(".vc-promo-title");
  if (vcTitle) vcTitle.textContent = "Erstelle ein Video von deinem Crush";
  const vcDesc = document.querySelector(".vc-promo-desc");
  if (vcDesc) vcDesc.textContent = "Lade ein beliebiges Foto hoch und unsere KI verwandelt es in ein 10-Sekunden-Video. Ultra HD oder unzensiert — du entscheidest.";
  const vcBtn = document.querySelector(".vc-promo-btn");
  if (vcBtn) vcBtn.textContent = "🎥 Video Creator testen";
  const vcCost = document.querySelector(".vc-promo-cost");
  if (vcCost) vcCost.textContent = "9 Token pro Video";

  const vcBenefit = document.querySelector(".vc-benefit-text");
  if (vcBenefit) { vcBenefit.textContent = "Erstelle Videos von deinem Crush aus einem Foto"; vcBenefit.style.background = "linear-gradient(90deg,#f472b6,#a855f7)"; vcBenefit.style.webkitBackgroundClip = "text"; vcBenefit.style.webkitTextFillColor = "transparent"; }

}); // Ende DOMContentLoaded

} // Ende if (isGerman)