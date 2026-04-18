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
        "Discute avec Katie, notre assistante support IA. Elle peut vérifier ton compte, corriger des problèmes, annuler ton abonnement, traiter des remboursements et plus — directement depuis ce chat.";
    }

    // Topbar
    const topbarName = document.getElementById("topbar-name");
    if (topbarName) topbarName.textContent = "Katie – Support MyAiCrush";

    const topbarStatus = document.getElementById("topbar-status");
    if (topbarStatus) {
      topbarStatus.innerHTML = '<span class="online-dot"></span>En ligne · Je peux gérer la plupart des demandes';
    }

    // Welcome message
    const welcomeMsg = document.getElementById("welcome-msg");
    if (welcomeMsg) {
      welcomeMsg.innerHTML =
        "Coucou 🩷 Je suis Katie, ton assistante support.\n\n" +
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

// i18n-contact.js — German translation for AI-powered contact.html

const isGerman = navigator.language?.startsWith("de");

if (isGerman) {
  document.addEventListener("DOMContentLoaded", () => {

    // Page header
    const title = document.getElementById("page-title");
    if (title) title.textContent = "Kontakt & Support 🩷";

    const desc = document.getElementById("page-desc");
    if (desc) {
      desc.textContent =
        "Chatte mit Katie, unserer KI-Support-Assistentin. Sie kann dein Konto überprüfen, Probleme beheben, dein Abo kündigen, Rückerstattungen bearbeiten und mehr — direkt hier im Chat.";
    }

    // Topbar
    const topbarName = document.getElementById("topbar-name");
    if (topbarName) topbarName.textContent = "Katie – Support MyAiCrush";

    const topbarStatus = document.getElementById("topbar-status");
    if (topbarStatus) {
      topbarStatus.innerHTML = '<span class="online-dot"></span>Online · Ich kann die meisten Anfragen bearbeiten';
    }

    // Welcome message
    const welcomeMsg = document.getElementById("welcome-msg");
    if (welcomeMsg) {
      welcomeMsg.innerHTML =
        "Hey 🩷 Ich bin Katie, deine Support-Assistentin.\n\n" +
        "Ich kann dir direkt helfen bei:\n" +
        "• Premium-Probleme beheben\n" +
        "• Dein Abo kündigen\n" +
        "• Eine Rückerstattung bearbeiten\n" +
        "• Dein Konto löschen\n" +
        "• Deine Tokens überprüfen\n" +
        "• Und mehr…\n\n" +
        "Schreib deine Nachricht unten, oder nutze einen Schnellzugriff!";
    }

    // Suggestions toggle
    const suggestionsLabel = document.getElementById("suggestions-label");
    if (suggestionsLabel) suggestionsLabel.textContent = "Schnellzugriffe";

    // Quick buttons — update labels AND data-msg
    const buttonsDE = {
      "My premium isn't working after payment": { label: "Premium funktioniert nicht", msg: "Mein Premium funktioniert nach der Zahlung nicht" },
      "I want to cancel my subscription": { label: "Abo kündigen", msg: "Ich möchte mein Abo kündigen" },
      "I want a refund": { label: "Rückerstattung", msg: "Ich möchte eine Rückerstattung" },
      "I want to delete my account and all my data": { label: "Konto löschen", msg: "Ich möchte mein Konto und alle meine Daten löschen" },
      "I bought tokens but didn't receive them": { label: "Tokens nicht erhalten", msg: "Ich habe Tokens gekauft, aber nicht erhalten" },
      "I can't log in to my account": { label: "Kann mich nicht einloggen", msg: "Ich kann mich nicht in mein Konto einloggen" },
      "I forgot my password": { label: "Passwort vergessen", msg: "Ich habe mein Passwort vergessen" },
      "What's the difference between premium and tokens?": { label: "Premium vs Tokens", msg: "Was ist der Unterschied zwischen Premium und Tokens?" },
      "I was charged twice": { label: "Doppelt abgebucht", msg: "Mir wurde doppelt abgebucht" },
      "Is MyAiCrush private and secure?": { label: "Datenschutz & Sicherheit", msg: "Ist MyAiCrush privat und sicher?" },
      "My issue isn't listed here": { label: "Anderes Problem", msg: "Mein Problem ist nicht in der Liste" },
    };

    document.querySelectorAll(".qq-btn").forEach((btn) => {
      const enMsg = btn.dataset.msg;
      const de = buttonsDE[enMsg];
      if (de) {
        btn.textContent = de.label;
        btn.dataset.msg = de.msg;
      }
    });

    // Input placeholder
    const chatInput = document.getElementById("chat-input");
    if (chatInput) chatInput.placeholder = "Schreib deine Nachricht...";

    // Footer
    const footerCopyright = document.querySelector(".footer-links p");
    if (footerCopyright) footerCopyright.textContent = "© 2026 MyAICrush – Alle Rechte vorbehalten";

    document.querySelectorAll(".footer-links a").forEach((link) => {
      if (link.href.includes("privacy-policy")) link.textContent = "Datenschutzrichtlinie";
      if (link.href.includes("terms-and-conditions")) link.textContent = "Allgemeine Geschäftsbedingungen";
    });

    const legalToggle = document.querySelector(".legal-toggle");
    if (legalToggle) legalToggle.textContent = "+ Rechtliche Hinweise & Zahlungssupport";

    const legalDE = [
      { title: "i) Altersbeschränkung", text: "Diese Seite ist ausschließlich für Erwachsene ab 18 Jahren (in manchen Ländern ab 21 Jahren). Mit dem Zugriff auf diese Seite bestätigst du, dass du das erforderliche Mindestalter erreicht hast." },
      { title: "ii) KI-generierte Inhalte", text: "Alle Charaktere und Gespräche werden von künstlicher Intelligenz erzeugt. Es sind keine echten Personen beteiligt." },
      { title: "iii) Verbotene Inhalte", text: "Jegliche Inhalte, die Minderjährige, nicht einvernehmliche Handlungen oder illegale Aktivitäten darstellen, sind strengstens verboten." },
      { title: "iv) Nutzerinhalte", text: "Nutzer können Bilder in Gesprächen senden. Diese Bilder dürfen nicht weiterverbreitet werden." },
      { title: "v) Nur zur Unterhaltung", text: "Diese Plattform dient ausschließlich der Unterhaltung. Es wird keine professionelle Beratung angeboten." },
      { title: "vi) Datenschutz", text: "Gespräche können zur Moderation aufgezeichnet werden. Wir verkaufen deine persönlichen Daten nicht." },
    ];

    document.querySelectorAll(".legal-body section").forEach((section, i) => {
      if (!legalDE[i]) return;
      const strong = section.querySelector("strong");
      if (strong) strong.textContent = legalDE[i].title;
      const br = section.querySelector("br");
      if (br && br.nextSibling) br.nextSibling.textContent = "\n" + legalDE[i].text;
    });

    const billingBox = document.querySelector(".billing-box");
    if (billingBox) {
      const strong = billingBox.closest("section")?.querySelector("strong");
      if (strong) strong.textContent = "vii) Zahlungssupport & Rückerstattungen";
      const explodelyLink = billingBox.querySelector('a[href*="shorturl"]');
      if (explodelyLink) explodelyLink.textContent = "Zahlungssupport Explodely ↗";
      const boxTextNodes = [...billingBox.childNodes].filter(n => n.nodeType === Node.TEXT_NODE);
      boxTextNodes.forEach(n => {
        if (n.textContent.includes("payment questions") || n.textContent.includes("money-back")) {
          n.textContent = n.textContent.replace(/For payment questions.*guarantee:/, "Für Zahlungsfragen oder um deine 60-Tage-Geld-zurück-Garantie zu nutzen:");
        }
      });
    }

    document.title = "Kontakt & Support 🩷";

    const sendBtn = document.getElementById("send-btn");
    if (sendBtn) sendBtn.title = "Senden";
  });
}
