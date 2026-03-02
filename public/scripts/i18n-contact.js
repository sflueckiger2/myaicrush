// i18n-contact.js — French translation for contact.html (FAQ chat)
// Updated to match new HTML structure (redesigned chatbot)

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {
  document.addEventListener("DOMContentLoaded", () => {

    // ===== TITLE & DESCRIPTION =====
    const title = document.querySelector(".page-header h1");
    if (title) title.textContent = "Contact & Support 🩷";

    const desc = document.querySelector(".page-header p");
    if (desc) {
      desc.textContent =
        "Discute avec Juliette, notre assistante support. Choisis une question ci-dessous et elle t'explique. Si ton cas nécessite vraiment une action manuelle sur ton compte, elle te donnera l'email de l'équipe.";
    }

    // ===== CHAT TOP BAR =====
    const topbarStrong = document.querySelector(".chat-topbar-info strong");
    if (topbarStrong) topbarStrong.textContent = "Juliette – Support MyAiCrush";

    const topbarSpan = document.querySelector(".chat-topbar-info span");
    if (topbarSpan) {
      topbarSpan.innerHTML = '<span class="online-dot"></span>En ligne · Ne mets jamais tes infos de carte ici 💳🚫';
    }

    // ===== FIRST BOT MESSAGE =====
    const firstBotMessage = document.querySelector("#chat-messages .msg.bot");
    if (firstBotMessage) {
      firstBotMessage.innerHTML =
        "Coucou 🩷 Je suis Juliette, ton assistante support virtuelle.<br><br>" +
        "Appuie sur l'une des questions ci-dessous et je t'explique étape par étape.<br><br>" +
        "Si ton cas nécessite vraiment une action manuelle (remboursement, correction de prélèvement, suppression de compte…), je te donnerai l'adresse email de l'équipe humaine.";
    }

    // ===== QUICK QUESTIONS LABEL =====
    const qqTitle = document.querySelector(".qqt");
    if (qqTitle) qqTitle.textContent = "Questions rapides — appuie pour obtenir une réponse";

    // ===== BUTTON LABELS =====
    const buttonsLabelsFR = {
      premium_not_active:   "Premium pas actif après paiement",
      premium_vs_tokens:    "Premium vs jetons — quelle différence ?",
      tokens_not_received:  "J'ai acheté des jetons mais je ne les ai pas reçus",
      tokens_refund:        "Remboursement de jetons",
      forgot_password:      "J'ai oublié mon mot de passe",
      cant_login:           "Je n'arrive pas à me connecter",
      refund_request:       "Je veux un remboursement",
      double_charge:        "Prélevé deux fois",
      delete_account:       "Supprimer mon compte",
      nympho_mode:          "Mode nymphomane",
      audio_calls:          "Appels audio",
      mobile_app:           "Application mobile",
      privacy_security:     "Confidentialité & sécurité",
      other_issue:          "Mon problème n'est pas dans la liste"
    };

    document.querySelectorAll(".qq-btn").forEach(btn => {
      const key = btn.dataset.key;
      if (buttonsLabelsFR[key]) btn.textContent = buttonsLabelsFR[key];
    });

    // ===== HINT =====
    const chatHint = document.querySelector(".chat-hint");
    if (chatHint) {
      chatHint.innerHTML = '<i class="fas fa-circle-info"></i> Pour les remboursements, doubles prélèvements ou suppressions de compte, Juliette te donnera l\'email après son explication.';
    }

    // ===== OVERRIDE window.FAQ WITH FRENCH TEXT =====
    // window.FAQ is defined in contact.html; we override it here for French users.
    const E = "contact@myaicrush.ai";

    window.FAQ = {
      premium_not_active: {
        question: "Mon Premium ne fonctionne pas / pas activé après paiement",
        answer: [
          "Je comprends, c'est frustrant de payer et de ne pas voir Premium s'activer 💗",
          "",
          "Dans la grande majorité des cas, c'est simplement un problème d'email : Premium est attaché à l'email utilisé pour le paiement.",
          "",
          "Tu peux corriger ça toi-même en 2 minutes :",
          "",
          "1️⃣ Va sur ta page profil :",
          "https://myaicrush.ai/profile.html",
          "",
          "2️⃣ Regarde l'email affiché là (celui avec lequel tu es connecté).",
          "",
          "3️⃣ Ouvre ta boîte mail et retrouve l'email de confirmation de paiement que tu as reçu. L'adresse qui a reçu cet email = l'email relié à Premium.",
          "",
          "4️⃣ Si les deux emails sont différents, tu as 2 options :",
          "- Te déconnecter et te reconnecter avec l'email de paiement",
          "- Ou, depuis la page profil, créer un compte avec l'email de paiement",
          "",
          "Une fois connecté avec l'email de paiement, Premium sera automatiquement reconnu.",
          "",
          "Si après ces étapes Premium n'apparaît toujours pas, contacte :",
          E,
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      premium_vs_tokens: {
        question: "Différence entre Premium & jetons",
        answer: [
          "Petit récap rapide :",
          "",
          "• Premium = chat illimité avec les IA + accès à tous les personnages + meilleure expérience générale.",
          "• Jetons = servent pour les extras :",
          "  – mode nymphomane",
          "  – contenus privés (photos/vidéos plus hot)",
          "  – certaines fonctionnalités audio et options spéciales",
          "",
          'Donc même avec Premium, certains contenus très "hot" continuent à utiliser des jetons.',
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      tokens_not_received: {
        question: "J'ai acheté des jetons mais je ne les ai pas reçus",
        answer: [
          "Normalement, les jetons sont crédités immédiatement après le paiement.",
          "",
          "Vérifie ceci :",
          "",
          "1️⃣ Va sur ta page profil :",
          "https://myaicrush.ai/profile.html",
          "",
          "2️⃣ Assure-toi d'être connecté avec le même email que celui utilisé pour payer les jetons.",
          "",
          "Si le solde ne te paraît toujours pas correct, écris à :",
          E,
          "",
          "En précisant :",
          "• l'email de ton compte MyAiCrush",
          "• une capture ou les détails du paiement des jetons",
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      tokens_refund: {
        question: "Remboursement de jetons",
        answer: [
          "En général, les jetons déjà consommés ne sont pas remboursés.",
          "",
          "Si tu penses qu'il y a eu un bug (par exemple une grosse déduction que tu ne comprends pas), tu peux contacter :",
          E,
          "",
          "En précisant :",
          "• ton email",
          "• la date de l'achat de jetons",
          "• ce qui te semble anormal",
          "",
          "L'équipe examinera ton cas et pourra proposer un geste commercial (jetons offerts, etc.).",
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      forgot_password: {
        question: "J'ai oublié mon mot de passe",
        answer: [
          "Pas de panique, ça arrive 😌",
          "",
          "1️⃣ Va sur :",
          "https://myaicrush.ai/profile.html",
          "",
          "2️⃣ Clique sur « Mot de passe oublié »",
          "",
          "3️⃣ Suis les instructions dans l'email de réinitialisation (pense à vérifier les spams / promotions).",
          "",
          "Si tu ne reçois toujours rien, écris à :",
          E,
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      cant_login: {
        question: "Je n'arrive pas à me connecter",
        answer: [
          "Essaie d'abord ceci :",
          "",
          "1️⃣ Va sur :",
          "https://myaicrush.ai/profile.html",
          "",
          "2️⃣ Vérifie que tu utilises le bon email (le même que pour tes paiements et connexions habituelles).",
          "",
          "3️⃣ Si tu as oublié ton mot de passe, clique sur « Mot de passe oublié » et suis la procédure.",
          "",
          "Si après ça tu ne peux toujours pas te connecter, écris à :",
          E,
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      refund_request: {
        question: "Je veux un remboursement",
        answer: [
          "Je suis désolée si l'expérience n'a pas été à la hauteur de tes attentes 💗",
          "",
          "Les remboursements doivent être traités manuellement par l'équipe facturation.",
          "",
          "Merci d'écrire à :",
          E,
          "",
          "En indiquant :",
          "• l'email que tu utilises sur MyAiCrush",
          "• l'achat concerné (Premium, jetons, autre)",
          "• la date approximative de l'achat",
          "• une brève explication (ça nous aide à améliorer le service)",
          "",
          "L'équipe examinera ta demande et te répondra rapidement.",
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      double_charge: {
        question: "J'ai été prélevé deux fois",
        answer: [
          "Ça mérite clairement une vérification manuelle, et je suis désolée pour le stress 😕",
          "",
          "Merci d'écrire à :",
          E,
          "",
          "En joignant :",
          "• l'email de ton compte MyAiCrush",
          "• une capture d'écran montrant les deux prélèvements (montant + dates)",
          "",
          "L'équipe vérifiera et remboursera tout prélèvement en double si c'est confirmé.",
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      delete_account: {
        question: "Supprimer mon compte",
        answer: [
          "La suppression de compte doit être faite manuellement pour des raisons de sécurité.",
          "",
          "Merci d'écrire à :",
          E,
          "",
          "En indiquant clairement : « Je souhaite la suppression complète de mon compte et de mes données ».",
          "",
          "L'équipe procédera à la suppression dans les meilleurs délais.",
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      nympho_mode: {
        question: "Mode nymphomane",
        answer: [
          "Le mode nymphomane est une option spéciale qui rend l'IA :",
          "",
          "• beaucoup plus coquine et directe",
          "• plus explicite dans ses réponses (toujours dans les limites légales et de sécurité)",
          "• capable de débloquer des contenus plus hot selon le personnage",
          "",
          "Ce mode utilise des jetons et n'est pas inclus gratuitement dans Premium, car il débloque un niveau d'intensité supérieur et consomme plus de ressources.",
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      audio_calls: {
        question: "Appels audio",
        answer: [
          "Les appels audio sont pensés pour te permettre d'interagir avec l'IA par la voix.",
          "",
          "Mais pour le moment, les appels audio sont indisponibles sur MyAiCrush, même si tu peux encore voir des mentions à certains endroits.",
          "",
          "Nous travaillons sur une nouvelle version plus stable pour l'avenir. En attendant, tu peux profiter du chat et des autres fonctionnalités.",
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      mobile_app: {
        question: "Application mobile",
        answer: [
          "Il n'y a pas encore d'application mobile native (App Store / Google Play).",
          "",
          "En revanche, le site MyAiCrush est entièrement optimisé pour mobile, et tu peux l'ajouter à l'écran d'accueil de ton téléphone pour l'utiliser presque comme une app.",
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      privacy_security: {
        question: "Confidentialité & sécurité",
        answer: [
          "La plateforme est conçue pour être la plus privée et sécurisée possible :",
          "",
          "• aucune revente de tes données personnelles",
          "• les conversations peuvent être enregistrées pour la modération et la qualité",
          "• le contenu est strictement pour adultes et filtré",
          "",
          "Tu peux lire tous les détails ici :",
          "Politique de confidentialité : https://myaicrush.ai/privacy-policy.html",
          "",
          "Belle journée 🌸"
        ].join("\n")
      },
      other_issue: {
        question: "Mon problème n'est pas dans la liste",
        answer: [
          "Merci pour ton message 💌",
          "",
          "Cette page couvre les questions les plus fréquentes : Premium, jetons, connexion, remboursements, mode nymphomane, appels audio, etc.",
          "",
          "Si ta situation est plus spécifique ou complexe, le mieux est de contacter l'équipe humaine :",
          "",
          E,
          "",
          "En incluant :",
          "• l'email de ton compte MyAiCrush",
          "• une description courte de ton souci",
          "• une capture d'écran si ça aide",
          "",
          "Belle journée 🌸"
        ].join("\n")
      }
    };

    // ===== FOOTER & LEGAL =====
    const footerCopyright = document.querySelector(".footer-links p");
    if (footerCopyright) footerCopyright.textContent = "© 2026 MyAICrush – Tous droits réservés";

    document.querySelectorAll(".footer-links a").forEach(link => {
      if (link.href.includes("privacy-policy"))       link.textContent = "Politique de confidentialité";
      if (link.href.includes("terms-and-conditions")) link.textContent = "Conditions générales";
    });

    const legalToggle = document.querySelector(".legal-toggle");
    if (legalToggle) legalToggle.textContent = "+ Mentions légales & Support paiement";

    const legalFR = [
      { title: "i) Restriction d'âge",                    text: "Ce site est réservé aux adultes de 18 ans et plus (21 ans dans certains pays). En accédant à ce site, vous confirmez avoir l'âge requis. L'accès aux mineurs est strictement interdit." },
      { title: "ii) Contenu généré par IA",                text: "Tous les personnages et conversations sont générés par intelligence artificielle. Aucune personne réelle n'est impliquée. Les personnages sont entièrement fictifs. Toute ressemblance avec des personnes réelles est purement fortuite." },
      { title: "iii) Contenu interdit",                    text: "Tout contenu impliquant des mineurs, des actes non consentis ou des activités illégales est strictement interdit. Toutes les interactions sont modérées et filtrées." },
      { title: "iv) Contenu généré par les utilisateurs",  text: "Les utilisateurs peuvent envoyer des images dans les conversations. Ces images ne peuvent pas être modifiées ni redistribuées. Tout contenu enfreignant nos règles sera supprimé et peut entraîner la suspension du compte." },
      { title: "v) Divertissement uniquement",             text: "Cette plateforme est destinée au divertissement uniquement. Aucun conseil professionnel (juridique, médical, financier ou psychologique) n'est fourni." },
      { title: "vi) Confidentialité & Données",            text: "Les conversations peuvent être enregistrées à des fins de modération et de qualité. Vos données sont traitées conformément à notre politique de confidentialité. Nous ne vendons pas vos données personnelles." }
    ];

    document.querySelectorAll(".legal-body section").forEach((section, i) => {
      if (!legalFR[i]) return;
      const strong = section.querySelector("strong");
      if (strong) strong.textContent = legalFR[i].title;
      const textNode = [...section.childNodes].find(n => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (textNode) textNode.textContent = "\n" + legalFR[i].text;
    });

    const billingBox = document.querySelector(".billing-box");
    if (billingBox) {
      const strong = billingBox.querySelector("strong");
      if (strong) strong.textContent = "vii) Support paiement & Remboursements";
      const textNode = [...billingBox.childNodes].find(n => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (textNode) textNode.textContent = "\nPour toute question sur ton paiement ou pour exercer ton droit au remboursement sous 15 jours, contacte :\n";
      const explodelyLink = billingBox.querySelector('a[href*="shorturl"]');
      if (explodelyLink) explodelyLink.textContent = "Support paiement Explodely ↗";
    }

  });
}