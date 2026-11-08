document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginAlert = document.getElementById('loginAlert');

    const btnLogout = document.getElementById('btnLogout');
    const btnProfileLogout = document.getElementById('btnProfileLogout');
    const btnProfile = document.getElementById('btnProfile');

    function t(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback)
            : fallback;
    }

    function showLoginError(message) {
        if (!loginAlert) return;

        loginAlert.innerText = message;
        loginAlert.classList.remove('d-none');
    }

    function resetLoginButton(button) {
        if (!button) return;

        button.disabled = false;
        button.innerText = t(
            'establishSecureSession',
            'Establish Secure Session'
        );
    }

    // ==========================================
    // LOGIN
    // ==========================================

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const btnSubmit = loginForm.querySelector('button[type="submit"]');

            loginAlert?.classList.add('d-none');

            if (!username || !password) {
                showLoginError('Username and password are required.');
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `
                <span class="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"></span>
                ${t('authenticating', 'Authenticating...')}
            `;

            try {
                const response = await HttpClient.post(
                    ENDPOINTS.AUTH.LOGIN,
                    { username, password }
                );

                const authData = response?.data;
                const token = authData?.token;
                const backendUser = authData?.user;

                if (!token || !backendUser?.username) {
                    throw new Error(
                        'Invalid authentication response from server.'
                    );
                }

                const userData = {
                    username: backendUser.username,
                    name: backendUser.fullName || backendUser.username,
                    role: backendUser.role
                };

                sessionStorage.setItem('nova_token', token);
                sessionStorage.setItem(
                    'nova_user',
                    JSON.stringify(userData)
                );

                window.location.replace('app.html');

            } catch (error) {
                console.error('Login error:', error);

                sessionStorage.removeItem('nova_token');
                sessionStorage.removeItem('nova_user');

                showLoginError(
                    error.status === 401
                        ? t(
                            'invalidCredentials',
                            'Invalid username or password.'
                        )
                        : error.message || 'Unable to connect to the server.'
                );

                resetLoginButton(btnSubmit);
            }
        });
    }

    // ==========================================
    // LOGOUT
    // ==========================================

    let logoutInProgress = false;

    async function logout() {
        if (logoutInProgress) return;

        logoutInProgress = true;

        if (btnLogout) btnLogout.disabled = true;
        if (btnProfileLogout) btnProfileLogout.disabled = true;

        try {
            if (sessionStorage.getItem('nova_token')) {
                await HttpClient.post(ENDPOINTS.AUTH.LOGOUT, {});
            }
        } catch (error) {
            console.warn('Backend logout failed:', error);
        } finally {
            sessionStorage.removeItem('nova_token');
            sessionStorage.removeItem('nova_user');

            window.location.replace('index.html');
        }
    }

    btnLogout?.addEventListener('click', logout);
    btnProfileLogout?.addEventListener('click', logout);

    // ==========================================
    // PERFIL Y PROTECCIÓN DE LA APLICACIÓN
    // ==========================================

    if (window.location.pathname.includes('app.html')) {
        const token = sessionStorage.getItem('nova_token');
        const user = sessionStorage.getItem('nova_user');

        if (!token || !user) {
            sessionStorage.removeItem('nova_token');
            sessionStorage.removeItem('nova_user');
            window.location.replace('index.html');
            return;
        }

        try {
            const userData = JSON.parse(user);

            const userNameEl = document.getElementById('user-name');
            const userRoleEl = document.getElementById('user-role');

            if (userNameEl) {
                userNameEl.innerText =
                    userData.name || userData.username;
            }

            if (userRoleEl) {
                userRoleEl.innerText = userData.role || '';
            }

        } catch (error) {
            console.error('Invalid session data:', error);

            sessionStorage.removeItem('nova_token');
            sessionStorage.removeItem('nova_user');

            window.location.replace('index.html');
        }
    }

    // ==========================================
    // CAMBIO DE IDIOMA
    // ==========================================

    document.addEventListener('nova:languageChanged', () => {
        if (loginForm) {
            const btnSubmit = loginForm.querySelector(
                'button[type="submit"]'
            );

            if (btnSubmit && !btnSubmit.disabled) {
                resetLoginButton(btnSubmit);
            }
        }

        if (loginAlert && !loginAlert.classList.contains('d-none')) {
            loginAlert.innerText = t(
                'invalidCredentials',
                'Invalid username or password.'
            );
        }
    });
});