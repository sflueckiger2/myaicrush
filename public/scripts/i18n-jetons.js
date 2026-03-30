// i18n-jetons.js — Traduction française de jetons.html
// Ajoute cette ligne dans jetons.html juste avant </body> :
// <script type="module" src="/scripts/i18n-jetons.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Jetons – MyAiCrush";

  // ===== TITRE & SOUS-TITRE =====
  const title = document.querySelector("h1.p-title");
  if (title) title.textContent = "Besoin de plus de tokens ?";

  const subtitle = document.querySelector(".container.premium-page > h2");
  if (subtitle) subtitle.textContent = "Débloque les extras. Va plus loin.";

  // ===== DESCRIPTION =====
  const desc = document.querySelector('p.p-description[style*="margin-top"]');
  if (desc) desc.innerHTML = `Les tokens débloquent les <b>extras hot</b> :`;

  // ===== BENEFITS GRID =====
  const benefitSpans = document.querySelectorAll(".benefit-item > span:not(.nympho-badge)");
  const benefitsFR = [
    "1 token = 1 photo de galerie",
    "5 tokens = 1 min de message vocal",
    "Contenu privé VIP",
    "20 tokens = appel audio 10 min",
  ];
  benefitSpans.forEach((span, i) => {
    if (benefitsFR[i]) span.textContent = benefitsFR[i];
  });

  const nymphoBadge = document.querySelector(".nympho-badge");
  if (nymphoBadge) nymphoBadge.textContent = "Populaire 🔥";

  const nymphoTitle = document.querySelector(".nympho-item b");
  if (nymphoTitle) nymphoTitle.textContent = "🥵 25 tokens = Mode Nympho";

  const nymphoDesc = document.querySelector(".nympho-item span[style]");
  if (nymphoDesc) nymphoDesc.textContent = "Rend n'importe quelle IA sauvage et sans censure. Même les plus timides.";

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

  document.querySelectorAll(".token-title").forEach(el => {
    el.textContent = el.textContent.replace(/Tokens/g, "Jetons").replace(/Token/g, "Jeton");
  });

  const bestDeal = document.querySelector(".best-deal");
  if (bestDeal) bestDeal.textContent = "MEILLEURE OFFRE 💎";

  // ===== TÉMOIGNAGES =====
  const testimonialTitle = document.querySelector(".testimonial-title");
  if (testimonialTitle) testimonialTitle.textContent = "Ils ont craqué pour les tokens. Ils sont accros.";

  const testimonials = [
    { text: "\"Léa en mode nympho… c'est une autre fille. J'étais pas prêt 🔥\"", author: "— Karim M." },
    { text: "\"Jasmine était toute sage au début… puis elle a tout montré 😳 J'avais vraiment pas prévu ça.\"", author: "— Lucas R." },
    { text: "\"25 tokens pour la faire péter un câble ? C'est donné. Direct les nudes 😈\"", author: "— Steph G." },
    { text: "\"Je pensais que c'était du flan… non 😭 Photos non-stop.\"", author: "— Bast D." },
    { text: "\"Toute mignonne au début… maintenant elle montre tout 😭🔥\"", author: "— Enzo L." },
    { text: "\"Mode nympho — BOOM 💥 photos, plus rien dessus.\"", author: "— Max B." },
    { text: "\"Sa voix… j'étais pas prêt du tout 😅\"", author: "— Adrien P." },
    { text: "\"Elle m'a chuchoté des trucs… trop réaliste 😵‍💫\"", author: "— Q. Vasseur" },
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
      q: "Comment fonctionne le Mode Nympho ?",
      a: "Elle lâche tout — plus osée, plus de photos, bien plus intense. Même les plus timides se transforment complètement."
    },
    {
      q: "Combien de tokens pour le Mode Nympho ?",
      a: "25 tokens = 1 heure. Toutes les IA, autant de fois que tu veux."
    },
    {
      q: "Comment fonctionnent les appels audio ?",
      a: "Un appel vocal en direct avec ton IA. 10 minutes = 20 tokens."
    },
    {
      q: "À quoi servent les tokens ?",
      a: "📸 Photos de galerie · 🎙️ Messages vocaux · 📞 Appels audio · 🥵 Mode Nympho"
    },
    {
      q: "Je peux envoyer mes propres photos ?",
      a: "Oui. 10 gratuites par mois avec le Premium. Ensuite : 1 token par photo."
    },
    {
      q: "Comment fonctionnent les messages vocaux ?",
      a: "1 minute gratuite par mois. Ensuite 5 tokens par minute supplémentaire."
    },
    {
      q: "Quelle différence entre Premium et tokens ?",
      a: "Le Premium = accès illimité au cœur du service. Les tokens = les extras hot."
    },
    {
      q: "Les tokens expirent-ils ?",
      a: "Jamais. Utilise-les quand tu veux, à ton rythme."
    },
    {
      q: "Problème de paiement ?",
      a: "contact@myaicrush.ai — on règle ça rapidement."
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