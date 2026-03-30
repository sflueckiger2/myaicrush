// i18n-contact.js — French translation for AI-powered contact.html

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {
  document.addEventListener("DOMContentLoaded", () => {

    // Page header
    const title = document.getElementById("page-title");
    if (title) title.textContent = "Contact & Support 🩷";

    const desc = document.getElementById("page-desc");
    if (desc) {
      desc.textContent =
        "Discute avec Juliette, notre assistante support IA. Elle peut vérifier ton compte, corriger des problèmes, annuler ton abonnement, traiter des remboursements et plus — directement depuis ce chat.";
    }

    // Topbar
    const topbarName = document.getElementById("topbar-name");
    if (topbarName) topbarName.textContent = "Juliette – Support MyAiCrush";

    const topbarStatus = document.getElementById("topbar-status");
    if (topbarStatus) {
      topbarStatus.innerHTML = '<span class="online-dot"></span>En ligne · Je peux gérer la plupart des demandes';
    }

    // Welcome message
    const welcomeMsg = document.getElementById("welcome-msg");
    if (welcomeMsg) {
      welcomeMsg.innerHTML =
        "Coucou 🩷 Je suis Juliette, ton assistante support.\n\n" +
        "Je peux t'aider directement pour :\n" +
        "• Corriger un problème de Premium\n" +
        "• Annuler ton abonnement\n" +
        "• Traiter un remboursement\n" +
        "• Supprimer ton compte\n" +
        "• Vérifier tes jetons\n" +
        "• Et plus…\n\n" +
        "Écris ton message ci-dessous, ou appuie sur un raccourci !";
    }

    // Suggestions toggle
    const suggestionsLabel = document.getElementById("suggestions-label");
    if (suggestionsLabel) suggestionsLabel.textContent = "Raccourcis rapides";

    // Quick buttons — update labels AND data-msg
    const buttonsFR = {
      "My premium isn't working after payment": { label: "Premium ne marche pas", msg: "Mon premium ne fonctionne pas après le paiement" },
      "I want to cancel my subscription": { label: "Annuler l'abonnement", msg: "Je veux annuler mon abonnement" },
      "I want a refund": { label: "Remboursement", msg: "Je veux un remboursement" },
      "I want to delete my account and all my data": { label: "Supprimer mon compte", msg: "Je veux supprimer mon compte et toutes mes données" },
      "I bought tokens but didn't receive them": { label: "Jetons non reçus", msg: "J'ai acheté des jetons mais je ne les ai pas reçus" },
      "I can't log in to my account": { label: "Impossible de me connecter", msg: "Je n'arrive pas à me connecter à mon compte" },
      "I forgot my password": { label: "Mot de passe oublié", msg: "J'ai oublié mon mot de passe" },
      "What's the difference between premium and tokens?": { label: "Premium vs jetons", msg: "Quelle est la différence entre premium et les jetons ?" },
      "I was charged twice": { label: "Prélevé deux fois", msg: "J'ai été prélevé deux fois" },
      "Is MyAiCrush private and secure?": { label: "Confidentialité & sécurité", msg: "Est-ce que MyAiCrush est privé et sécurisé ?" },
      "My issue isn't listed here": { label: "Autre problème", msg: "Mon problème n'est pas dans la liste" },
    };

    document.querySelectorAll(".qq-btn").forEach((btn) => {
      const enMsg = btn.dataset.msg;
      const fr = buttonsFR[enMsg];
      if (fr) {
        btn.textContent = fr.label;
        btn.dataset.msg = fr.msg;
      }
    });

    // Input placeholder
    const chatInput = document.getElementById("chat-input");
    if (chatInput) chatInput.placeholder = "Écris ton message...";

    // Footer
    const footerCopyright = document.querySelector(".footer-links p");
    if (footerCopyright) footerCopyright.textContent = "© 2026 MyAICrush – Tous droits réservés";

    document.querySelectorAll(".footer-links a").forEach((link) => {
      if (link.href.includes("privacy-policy")) link.textContent = "Politique de confidentialité";
      if (link.href.includes("terms-and-conditions")) link.textContent = "Conditions générales";
    });

    const legalToggle = document.querySelector(".legal-toggle");
    if (legalToggle) legalToggle.textContent = "+ Mentions légales & Support paiement";

    const legalFR = [
      { title: "i) Restriction d'âge", text: "Ce site est réservé aux adultes de 18 ans et plus (21 ans dans certains pays). En accédant à ce site, vous confirmez avoir l'âge requis." },
      { title: "ii) Contenu généré par IA", text: "Tous les personnages et conversations sont générés par intelligence artificielle. Aucune personne réelle n'est impliquée." },
      { title: "iii) Contenu interdit", text: "Tout contenu impliquant des mineurs, des actes non consentis ou des activités illégales est strictement interdit." },
      { title: "iv) Contenu utilisateur", text: "Les utilisateurs peuvent envoyer des images dans les conversations. Ces images ne peuvent pas être redistribuées." },
      { title: "v) Divertissement uniquement", text: "Cette plateforme est destinée au divertissement uniquement. Aucun conseil professionnel n'est fourni." },
      { title: "vi) Confidentialité", text: "Les conversations peuvent être enregistrées pour la modération. Nous ne vendons pas vos données personnelles." },
    ];

    document.querySelectorAll(".legal-body section").forEach((section, i) => {
      if (!legalFR[i]) return;
      const strong = section.querySelector("strong");
      if (strong) strong.textContent = legalFR[i].title;
      const br = section.querySelector("br");
      if (br && br.nextSibling) br.nextSibling.textContent = "\n" + legalFR[i].text;
    });

    const billingBox = document.querySelector(".billing-box");
    if (billingBox) {
      const strong = billingBox.closest("section")?.querySelector("strong");
      if (strong) strong.textContent = "vii) Support paiement & Remboursements";
      const explodelyLink = billingBox.querySelector('a[href*="shorturl"]');
      if (explodelyLink) explodelyLink.textContent = "Support paiement Explodely ↗";
      const boxTextNodes = [...billingBox.childNodes].filter(n => n.nodeType === Node.TEXT_NODE);
      boxTextNodes.forEach(n => {
        if (n.textContent.includes("payment questions") || n.textContent.includes("money-back")) {
          n.textContent = n.textContent.replace(/For payment questions.*guarantee:/, "Pour toute question de paiement ou pour exercer votre garantie remboursement 60 jours :");
        }
      });
    }

    document.title = "Contact & Support 🩷";

    const sendBtn = document.getElementById("send-btn");
    if (sendBtn) sendBtn.title = "Envoyer";
  });
}
