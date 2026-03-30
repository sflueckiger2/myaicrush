/**
 * i18n-confirmation-quiz.js
 * Traduction française de la page confirmation MyAiCrush.
 * S'active automatiquement si la langue du navigateur commence par "fr".
 *
 * Usage : ajouter juste avant </body> :
 *   <script src="i18n-confirmation-quiz.js" defer></script>
 */

(function () {
  // Activer uniquement pour les navigateurs en français
  const lang = navigator.language || navigator.userLanguage || '';
  if (!lang.toLowerCase().startsWith('fr')) return;

  const translations = {
    /* ── Titre de l'onglet ── */
    document_title: 'Confirmation – Bienvenue sur MyAiCrush',

    /* ── Bloc principal ── */
    heading_premium: 'Vous êtes maintenant Premium\u00a0!',
    subtext_premium:
      'Félicitations\u00a0— vous avez débloqué toutes les fonctionnalités <span class="text-pink-400 font-bold">Premium</span>\u00a0: messages illimités, photos et vidéos.',

    /* ── Bloc "One last step" ── */
    last_step_title: 'Une dernière étape\u00a0!',
    last_step_body:
      'Pour commencer à discuter avec votre IA, vous devez <span class="font-bold underline">créer votre compte</span> maintenant.',

    /* ── Avertissement critique ── */
    critical_label: '⚠️ Critique — Lisez ceci en premier',
    critical_main:
      'Vous <span class="text-red-400 underline decoration-2">DEVEZ</span> vous inscrire avec la <span class="text-yellow-300 font-black">même adresse e-mail exacte</span> que celle utilisée pour le paiement.',
    critical_sub:
      'Toute autre adresse e-mail = votre Premium ne sera pas activé.',

    /* ── Bouton CTA principal ── */
    cta_create: 'Créer mon compte',

    /* ── Pied de page ── */
    footer_badges: 'Accès immédiat &bull; Discrétion totale &bull; Support VIP',

    /* ── Modale de confirmation e-mail ── */
    modal_title: 'Dernier rappel\u00a0!',
    modal_body:
      'Lors de la création de votre compte, veillez à utiliser la <span class="text-yellow-300 font-black underline decoration-2">même adresse e-mail</span> que celle utilisée pour votre paiement.',
    modal_sub: "Mauvais e-mail = pas d\u2019acc\u00e8s Premium.",
    modal_confirm: "\u2705 Compris, c\u2019est parti\u00a0!",
    modal_back: '← Retour',
  };

  /* ────────────────────────────────────────────────
   * Helpers
   * ──────────────────────────────────────────────── */

  /** Remplace le innerHTML du premier élément correspondant au sélecteur. */
  function setHTML(selector, html) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  }

  /** Remplace le textContent du premier élément correspondant au sélecteur. */
  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  /* ────────────────────────────────────────────────
   * Application des traductions
   * ──────────────────────────────────────────────── */
  function applyTranslations() {
    // Titre de l'onglet
    document.title = translations.document_title;

    // Titre h1 principal
    setHTML('h1', translations.heading_premium);

    // Sous-titre principal (1er <p> après le <hr>… on cible le 1er <p> de .max-w-xl)
    const mainParas = document.querySelectorAll('.max-w-xl > p');
    if (mainParas[0]) mainParas[0].innerHTML = translations.subtext_premium;

    // "One last step" — h2
    setHTML('h2', translations.last_step_title);

    // Corps "One last step" — 1er <p> dans .bg-white\/5
    const stepBox = document.querySelector('.bg-white\\/5');
    if (stepBox) {
      const paras = stepBox.querySelectorAll('p');
      if (paras[0]) paras[0].innerHTML = translations.last_step_body;
    }

    // Avertissement critique — label, texte principal, sous-texte
    const critBox = document.querySelector('.bg-red-500\\/20');
    if (critBox) {
      const paras = critBox.querySelectorAll('p');
      if (paras[0]) paras[0].innerHTML = translations.critical_label;
      if (paras[1]) paras[1].innerHTML = translations.critical_main;
      if (paras[2]) paras[2].innerHTML = translations.critical_sub;
    }

    // Bouton CTA principal (onclick="openEmailConfirm()")
    const ctaBtn = document.querySelector('button[onclick="openEmailConfirm()"]');
    if (ctaBtn) ctaBtn.textContent = translations.cta_create;

    // Pied de page
    const footerP = document.querySelector('.max-w-xl .text-xs.text-gray-500');
    if (footerP) footerP.innerHTML = translations.footer_badges;

    // ── Modale ──
    const modal = document.getElementById('email-modal');
    if (modal) {
      // Titre modale (h3)
      const h3 = modal.querySelector('h3');
      if (h3) h3.innerHTML = translations.modal_title;

      const modalParas = modal.querySelectorAll('p');
      if (modalParas[0]) modalParas[0].innerHTML = translations.modal_body;
      if (modalParas[1]) modalParas[1].innerHTML = translations.modal_sub;

      // Bouton "Got it"
      const confirmLink = modal.querySelector('a.cta-button');
      if (confirmLink) confirmLink.textContent = translations.modal_confirm;

      // Bouton "Go back"
      const backBtn = modal.querySelector('button[onclick="closeEmailConfirm()"]');
      if (backBtn) backBtn.textContent = translations.modal_back;
    }
  }

  /* Lancer après le chargement complet du DOM */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTranslations);
  } else {
    applyTranslations();
  }
})();

(function () {
  const lang = navigator.language || navigator.userLanguage || '';
  if (!lang.toLowerCase().startsWith('de')) return;

  const translations = {
    document_title: 'Bestätigung – Willkommen bei MyAiCrush',

    heading_premium: 'Du bist jetzt Premium!',
    subtext_premium:
      'Glückwunsch — du hast alle <span class="text-pink-400 font-bold">Premium</span>-Funktionen freigeschaltet: unbegrenzte Nachrichten, Fotos und Videos.',

    last_step_title: 'Noch ein letzter Schritt!',
    last_step_body:
      'Um mit deiner KI zu chatten, musst du jetzt <span class="font-bold underline">dein Konto erstellen</span>.',

    critical_label: '⚠️ Wichtig — Lies das zuerst',
    critical_main:
      'Du <span class="text-red-400 underline decoration-2">MUSST</span> dich mit der <span class="text-yellow-300 font-black">exakt gleichen E-Mail-Adresse</span> registrieren, die du für die Zahlung verwendet hast.',
    critical_sub:
      'Andere E-Mail-Adresse = dein Premium wird nicht aktiviert.',

    cta_create: 'Mein Konto erstellen',

    footer_badges: 'Sofortzugang &bull; Volle Diskretion &bull; VIP-Support',

    modal_title: 'Letzte Erinnerung!',
    modal_body:
      'Achte bei der Kontoerstellung darauf, die <span class="text-yellow-300 font-black underline decoration-2">gleiche E-Mail-Adresse</span> zu verwenden, mit der du bezahlt hast.',
    modal_sub: 'Falsche E-Mail = kein Premium-Zugang.',
    modal_confirm: '✅ Verstanden, los geht\u2019s!',
    modal_back: '← Zurück',
  };

  function setHTML(selector, html) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  }

  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  function applyTranslationsDE() {
    document.title = translations.document_title;

    setHTML('h1', translations.heading_premium);

    const mainParas = document.querySelectorAll('.max-w-xl > p');
    if (mainParas[0]) mainParas[0].innerHTML = translations.subtext_premium;

    setHTML('h2', translations.last_step_title);

    const stepBox = document.querySelector('.bg-white\\/5');
    if (stepBox) {
      const paras = stepBox.querySelectorAll('p');
      if (paras[0]) paras[0].innerHTML = translations.last_step_body;
    }

    const critBox = document.querySelector('.bg-red-500\\/20');
    if (critBox) {
      const paras = critBox.querySelectorAll('p');
      if (paras[0]) paras[0].innerHTML = translations.critical_label;
      if (paras[1]) paras[1].innerHTML = translations.critical_main;
      if (paras[2]) paras[2].innerHTML = translations.critical_sub;
    }

    const ctaBtn = document.querySelector('button[onclick="openEmailConfirm()"]');
    if (ctaBtn) ctaBtn.textContent = translations.cta_create;

    const footerP = document.querySelector('.max-w-xl .text-xs.text-gray-500');
    if (footerP) footerP.innerHTML = translations.footer_badges;

    const modal = document.getElementById('email-modal');
    if (modal) {
      const h3 = modal.querySelector('h3');
      if (h3) h3.innerHTML = translations.modal_title;

      const modalParas = modal.querySelectorAll('p');
      if (modalParas[0]) modalParas[0].innerHTML = translations.modal_body;
      if (modalParas[1]) modalParas[1].innerHTML = translations.modal_sub;

      const confirmLink = modal.querySelector('a.cta-button');
      if (confirmLink) confirmLink.textContent = translations.modal_confirm;

      const backBtn = modal.querySelector('button[onclick="closeEmailConfirm()"]');
      if (backBtn) backBtn.textContent = translations.modal_back;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTranslationsDE);
  } else {
    applyTranslationsDE();
  }
})();