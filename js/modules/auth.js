
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginAlert = document.getElementById('loginAlert');
    const btnLogout = document.getElementById('btnLogout');

    function t(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback)
            : fallback;
    }

    function getLoginButtonText() {
        return t('establishSecureSession', 'Establish Secure Session');
    }

    function resetLoginButton(button) {
        if (!button) return;

        button.disabled = false;
        button.innerText = getLoginButtonText();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const btnSubmit = loginForm.querySelector('button[type="submit"]');

            if (loginAlert) {
                loginAlert.classList.add('d-none');
                loginAlert.innerText = t(
                    'invalidCredentials',
                    'Invalid credentials. Please try again.'
                );
            }

            btnSubmit.disabled = true;

            btnSubmit.innerHTML = `
                <span
                    class="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true">
                </span>
                ${t('authenticating', 'Authenticating...')}
            `;

            setTimeout(() => {
                if (username === 's.garcia' || username.includes('garcia')) {
                    sessionStorage.setItem(
                        'nova_user',
                        JSON.stringify({
                            id: 'U-001',
                            name: 'Santiago Garcia',
                            role: 'SOC L2'
                        })
                    );

                    window.location.href = 'app.html';
                } else {
                    if (loginAlert) {
                        loginAlert.classList.remove('d-none');
                    }

                    resetLoginButton(btnSubmit);
                }
            }, 800);
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('nova_user');
            window.location.href = 'index.html';
        });
    }

    if (window.location.pathname.includes('app.html')) {
        const user = sessionStorage.getItem('nova_user');

        if (!user) {
            window.location.href = 'index.html';
        } else {
            try {
                const userData = JSON.parse(user);

                const userNameEl = document.getElementById('user-name');

                if (userNameEl) {
                    userNameEl.innerText = userData.name;
                }
            } catch (error) {
                console.error('Invalid session data:', error);

                sessionStorage.removeItem('nova_user');
                window.location.href = 'index.html';
            }
        }
    }

    // Actualiza los textos del formulario si cambia el idioma.
    document.addEventListener('nova:languageChanged', () => {
        if (loginForm) {
            const btnSubmit = loginForm.querySelector('button[type="submit"]');

            if (btnSubmit && !btnSubmit.disabled) {
                resetLoginButton(btnSubmit);
            }
        }

        if (loginAlert && !loginAlert.classList.contains('d-none')) {
            loginAlert.innerText = t(
                'invalidCredentials',
                'Invalid credentials. Please try again.'
            );
        }
    });
});
