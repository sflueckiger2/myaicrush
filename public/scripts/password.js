// Définir l'URL de base dynamiquement (s'applique à localhost ou Render)
const BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
  const changePasswordForm = document.getElementById('change-password-form');

  if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', async (event) => {
          event.preventDefault();

          const currentPassword = document.getElementById('current-password').value;
          const newPassword = document.getElementById('new-password').value;
          const confirmPassword = document.getElementById('confirm-password').value;

          if (newPassword !== confirmPassword) {
              alert("New password and confirmation do not match!");
              return;
          }

          try {
              // Vérifie si l'utilisateur est connecté
              const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
              if (!user || !user.email) {
                  alert("User not logged in.");
                  return;
              }

              // Effectuer une requête vers l'API pour changer le mot de passe
              const response = await fetch(`${window.location.origin}/api/change-password`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                      email: user.email,
                      currentPassword,
                      newPassword,
                  }),
              });

              if (response.ok) {
                  alert("Password successfully changed!");
                  changePasswordForm.reset();
              } else {
                  const errorData = await response.json();
                  alert(errorData.message || 'Failed to change password.');
              }
          } catch (error) {
              console.error('Error changing password:', error);
              alert('An error occurred. Please try again.');
          }
      });
  }
});
