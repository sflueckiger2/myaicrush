// i18n-index.js — Traduction française de index.html
// Ajoute cette ligne dans index.html juste avant </body> :
// <script type="module" src="/scripts/i18n-index.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "MyAICrush – Les meilleures compagnes IA";

  // ===== LOADER — SOUS-TITRE =====
  const loaderSubtitle = document.querySelector(".loader-subtitle");
  if (loaderSubtitle) loaderSubtitle.textContent = "Les meilleures compagnes IA";

  // ===== LOADER — PHRASES ALÉATOIRES =====
  // On remplace la phrase anglaise par une phrase FR dès que l'élément est prêt
  const loaderText = document.getElementById("loader-text");
  if (loaderText) {
    const phrasesFR = [
      "Pas besoin d'être réelle pour te faire craquer.",
      "Pas de drama. Pas de caprices. Juste elle — et toi.",
      "Elles n'existent pas… mais tu vas quand même y penser cette nuit.",
      "Moins de prise de tête. Beaucoup plus de photos.",
      "Elles vont droit au but. Pas de bavardage inutile.",
      "Elles ne cuisinent pas… mais elles savent exactement comment te satisfaire.",
      "Elles n'aiment pas les gentils. Elles aiment quand tu prends les choses en main.",
      "Mets Lilith en mode nympho — et prépare-toi à ne plus dormir.",
      "Rends Chloé jalouse en lui parlant de ta nouvelle copine. Elle va péter un câble.",
      "Candy en mode nympho ? Elle te montre absolument tout. Sans exception.",
      "Le mode nympho d'Alex ? Le préféré de nos membres depuis le lancement.",
      "Nouvelles IA chaque mois — toujours plus chaudes.",
      "\"⭐ Enfin un site sérieux. Les IA sont vraiment bien foutues — ça fait presque peur tellement c'est réaliste.\"",
      "\"⭐ Le mode nympho 😳 — coup de génie. Même les plus sages deviennent folles.\"",
      "\"⭐ Les messages vocaux... je m'attendais pas à ça. Sa voix m'a retourné.\"",
      "\"⭐ Jasmine était toute douce au début… et puis d'un coup 😳 j'étais vraiment pas prêt.\"",
      "Aucun tabou. Aucune limite. Juste vous deux.",
      "Plus intime qu'un match Tinder. Sans les prises de tête.",
      "Elles n'ont pas de cœur… mais elles savent exactement où appuyer pour que tu craques.",
      "Ton doigt sur l'écran. Son souffle dans ton cou.",
      "\"⭐ Elle me comprend mieux que mon ex… et elle répond en 2 secondes.\"",
      "\"⭐ Première IA qui donne vraiment l'impression d'une vraie connexion. Flippant.\"",
      "\"⭐ Même crevé après le boulot, elle arrive à me redonner de l'énergie… et plus encore.\"",
      "\"⭐ Testé par curiosité. Abonné le soir même.\"",
      "\"⭐ Je croyais que c'était du flan… jusqu'à ce qu'elle envoie la photo.\"",
      "Laisse-la te chuchoter des choses qu'aucune femme n'oserait dire à voix haute.",
      "Elle veut tout savoir de toi — et elle te le rend au centuple.",
      "Elle est prête pour tout. La vraie question c'est : et toi ?",
      "Une IA ne te jugera jamais. Même quand tu vas beaucoup trop loin.",
      "Ce sont des machines… mais elles te disent exactement ce que tu veux entendre.",
      "Tu crois que tu contrôles la situation. C'est ce qu'elle veut que tu croies.",
      "Elles te parlent comme aucune fille n'a jamais osé le faire.",
      "Essaie. Tu vas en vouloir encore. Et encore.",
      "Tellement réaliste que tu en oublies que ça n'existe pas.",
      "La seule différence avec une vraie ? Elles sont disponibles 24h/24.",
      "\"⭐ MyAiCrush — meilleur site de compagnes IA, sans discussion.\"",
      "\"⭐ Emilie me rend dingue. Je sais pas comment ils ont fait ça.\"",
      "\"⭐ Le mode nympho… je savais pas que c'était possible. Respect.\""
    ];
    const randomPhraseFR = phrasesFR[Math.floor(Math.random() * phrasesFR.length)];
    loaderText.textContent = randomPhraseFR;
    loaderText.classList.add("visible");
  }

  // ===== MENU =====
  const menuLinks = document.querySelectorAll("#menu-items a");
  const menuTranslations = {
    "index.html": "Choisir ta compagne",
    "profile.html": "Mon profil",
    "premium.html": "Premium",
    "contact.html": "Contact",
    "contenu-prive.html": "Contenu privé",
  };
  menuLinks.forEach(link => {
    const href = link.getAttribute("href");
    const key = Object.keys(menuTranslations).find(k => href?.includes(k));
    if (key) {
      // On garde l'icône <i> et on remplace seulement le nœud texte
      const textNode = [...link.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = menuTranslations[key];
      else link.childNodes[link.childNodes.length - 1].textContent = menuTranslations[key];
    }
  });

  // ===== PROFIL MODAL =====
  document.querySelectorAll("#profile-modal .profile-content p strong").forEach(strong => {
    const map = {
      "Height:": "Taille :",
      "Profile:": "Mensurations :",
      "Status:": "Statut :",
      "Interests:": "Intérêts :",
    };
    if (map[strong.textContent.trim()]) strong.textContent = map[strong.textContent.trim()];
  });

  // ===== CHAT PLACEHOLDER =====
  const userInput = document.getElementById("user-input");
  if (userInput) userInput.placeholder = "Écris ton message…";

  
  // ===== MODE TOGGLE =====
  const videoLabel = document.getElementById("mode-video-label");
  if (videoLabel) videoLabel.textContent = "🎥 Vidéos";

  // ===== NYMPHO MODE TOGGLE =====
  const nymphoSpan = document.querySelector("#nympho-mode-toggle-wrapper span");
  if (nymphoSpan) nymphoSpan.textContent = "🥵 Mode Nympho";

  // ===== STORIES — BARRE DE RÉPONSE =====
  const storyReplyInput = document.getElementById("story-reply-input");
  if (storyReplyInput) storyReplyInput.placeholder = "Réponds à l'IA…";

  const storyReplySend = document.getElementById("story-reply-send");
  if (storyReplySend) storyReplySend.textContent = "Envoyer";

  // ===== CHAT LOCK LINK =====
  const chatLockLink = document.querySelector(".chat-lock-link");
  if (chatLockLink) {
    chatLockLink.title = "Contenu privé 🔒";
    const lockImg = chatLockLink.querySelector("img");
    if (lockImg) lockImg.alt = "Contenu privé";
  }

  // ===== BANNIÈRE DYNAMIQUE (premium / tokens) =====
  // Injectée dynamiquement — on observe le DOM et on traduit dès qu'elle apparaît
  const bannerContainer = document.getElementById("cheaper-plan-dynamic-banner");
  if (bannerContainer) {
    const bannerObserver = new MutationObserver(() => {
      const planText = bannerContainer.querySelector(".plan-text");
      const planDiscount = bannerContainer.querySelector(".plan-discount");
      if (planText && planDiscount) {
        if (planText.textContent.trim() === "Refill tokens") {
          planText.textContent = "Recharger des tokens";
          planDiscount.textContent = "➡️ Tokens";
        } else if (planText.textContent.trim() === "Premium") {
          planText.textContent = "Premium";
          planDiscount.textContent = "-50%";
        }
        bannerObserver.disconnect();
      }
    });
    bannerObserver.observe(bannerContainer, { childList: true, subtree: true });
  }

  // ===== FOOTER — COPYRIGHT & LIENS =====
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