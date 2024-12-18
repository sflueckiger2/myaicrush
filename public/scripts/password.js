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
          const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
          if (!user || !user.email) {
            alert("User not logged in.");
            return;
          }
  
          const response = await fetch(`${BASE_URL}/api/change-password`, { // Utilise BASE_URL ici
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
  
// Script pour le mot de passe oublié
document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    
    forgotPasswordLink.addEventListener('click', (event) => {
      event.preventDefault();
  
      // Affiche un champ pour entrer l'email
      const container = document.querySelector('.container');
      container.innerHTML = `
        <h1 class="p-title">Forgot Password</h1>
        <form id="forgot-password-form">
          <label for="email">Enter your email:</label>
          <input type="email" id="email" placeholder="Enter your email" required><br><br>
          <button type="submit" class="button">Send Reset Link</button>
        </form>
      `;
  
      // Gestion de la soumission du formulaire
      const forgotPasswordForm = document.getElementById('forgot-password-form');
      forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
  
        const email = document.getElementById('email').value;
  
        try {
          const response = await fetch(`${BASE_URL}/api/forgot-password`, { // Utilise BASE_URL ici
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          });
  
          if (response.ok) {
            alert('An email with the reset link has been sent.');
          } else {
            const errorData = await response.json();
            alert(errorData.message || 'Failed to send reset link.');
          }
        } catch (error) {
          console.error('Error sending reset link:', error);
          alert('An error occurred. Please try again.');
        }
      });
    });
  });
