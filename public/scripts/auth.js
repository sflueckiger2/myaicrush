document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');

    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value.trim();

            try {
                const response = await fetch('http://localhost:4000/api/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                if (!response.ok) {
                    throw new Error('Failed to sign up');
                }

                const data = await response.json();
                alert(data.message);
            } catch (error) {
                console.error('Error during signup:', error);
                alert('Signup failed. Please try again.');
            }
        });
    } else {
        console.error('Signup form not found.');
    }
});
