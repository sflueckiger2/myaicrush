document.addEventListener('DOMContentLoaded', () => {
  // Sélectionner le bouton hamburger et le menu
  const menuToggle = document.getElementById('menu-toggle');
  const menuItems = document.getElementById('menu-items');

  // Vérifier si les éléments existent avant d'ajouter les événements
  if (menuToggle && menuItems) {
    menuToggle.addEventListener('click', () => {
      menuItems.classList.toggle('visible');
    });
  } else {
    console.error('Le menu ou le bouton toggle n\'a pas été trouvé.');
  }
});
