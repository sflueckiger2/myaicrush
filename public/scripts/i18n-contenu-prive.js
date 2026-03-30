// i18n-contenu-prive.js — Traduction française de contenu-prive.html
// Ajoute cette ligne dans contenu-prive.html juste avant </body> :
// <script type="module" src="/scripts/i18n-contenu-prive.js"></script>

const isFrench = navigator.language?.startsWith("fr");

if (isFrench) {

document.addEventListener("DOMContentLoaded", () => {

  document.title = "Contenu Privé – MyAICrush";

  // ===== HEADER =====
  const headerTitle = document.querySelector(".header h1");
  if (headerTitle) headerTitle.textContent = "🔒 Contenu Privé 🔥";

  const headerDesc = document.querySelector(".header p");
  if (headerDesc) headerDesc.innerHTML = "📸 Photos exclusives &nbsp;·&nbsp; 🎥 Vidéos intimes &nbsp;·&nbsp; 😈 Sans censure";

  // ===== LOADER =====
  const loaderText = document.querySelector("#loader-overlay .loader-text");
  if (loaderText) loaderText.textContent = "Chargement...";

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
    { title: "i) Restriction d'âge (Obligatoire)", text: "Ce site est réservé aux adultes de 18 ans et plus (21 ans dans certains pays). En accédant à ce site, vous confirmez avoir l'âge requis. L'accès aux mineurs est strictement interdit." },
    { title: "ii) Contenu généré par IA", text: "Tous les personnages et conversations sont générés par intelligence artificielle. Aucune personne réelle n'est impliquée. Les personnages sont entièrement fictifs. Toute ressemblance avec des personnes réelles est purement fortuite." },
    { title: "iii) Contenu interdit", text: "Tout contenu impliquant des mineurs, des actes non consentis ou des activités illégales est strictement interdit. Toutes les interactions sont modérées et filtrées." },
    { title: "iv) Contenu généré par les utilisateurs", text: "Les utilisateurs peuvent envoyer des images dans les conversations. Ces images ne peuvent pas être modifiées ni redistribuées. Tout contenu enfreignant nos règles sera supprimé et peut entraîner la suspension du compte." },
    { title: "v) Divertissement uniquement", text: "Cette plateforme est destinée au divertissement uniquement. Aucun conseil professionnel (juridique, médical, financier ou psychologique) n'est fourni." },
    { title: "vi) Confidentialité & Données", text: "Les conversations peuvent être enregistrées à des fins de modération et de qualité. Vos données sont traitées conformément à notre politique de confidentialité. Nous ne vendons pas vos données personnelles." },
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
    if (br && br.nextSibling) br.nextSibling.textContent = "Une question sur ton paiement ou tu veux être remboursé ? On est là :";
    const explodelyLink = supportBox.querySelector('a[href*="shorturl"]');
    if (explodelyLink) explodelyLink.textContent = "Support paiement Explodely";
  }

}); // fin DOMContentLoaded

} // fin if (isFrench)