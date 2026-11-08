
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // ELEMENTOS DEL DOM
    // ==========================================

    const loginForm = document.getElementById('loginForm');
    const loginAlert = document.getElementById('loginAlert');

    const btnLogout = document.getElementById('btnLogout');
    const btnProfileLogout = document.getElementById('btnProfileLogout');
    const btnProfile = document.getElementById('btnProfile');


    // ==========================================
    // UTILIDADES
    // ==========================================

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

    function showLoginError(message) {
        if (!loginAlert) return;

        loginAlert.innerText = message;
        loginAlert.classList.remove('d-none');
    }


    // ==========================================
    // CIERRE DE SESIÓN
    // ==========================================

    let logoutInProgress = false;

    async function logout() {

        if (logoutInProgress) return;

        logoutInProgress = true;

        // Deshabilitar botones para evitar múltiples solicitudes.
        if (btnLogout) btnLogout.disabled = true;
        if (btnProfileLogout) btnProfileLogout.disabled = true;

        const token = sessionStorage.getItem('nova_token');

        try {

            // Intentar cerrar sesión en el backend.
            if (token && window.HttpClient && window.ENDPOINTS?.AUTH?.LOGOUT) {

                await HttpClient.post(
                    ENDPOINTS.AUTH.LOGOUT,
                    {}
                );

            }

        } catch (error) {

            console.warn(
                'Backend logout failed. Clearing local session anyway:',
                error
            );

        } finally {

            // Limpiar sesión local siempre.
            sessionStorage.removeItem('nova_token');
            sessionStorage.removeItem('nova_user');

            // Evitar regresar a la aplicación con el botón Atrás.
            window.location.replace('index.html');

        }
    }


    // ==========================================
    // CONECTAR BOTONES DE LOGOUT
    // ==========================================

    if (btnLogout) {
        btnLogout.addEventListener('click', logout);
    }

    if (btnProfileLogout) {
        btnProfileLogout.addEventListener('click', logout);
    }


    // ==========================================
    // PERFIL DE USUARIO
    // ==========================================

    if (btnProfile) {

        btnProfile.addEventListener('click', (event) => {

            event.preventDefault();

            // Perfil pendiente de implementar.
            console.info('User profile module is not implemented yet.');

        });

    }


    // ==========================================
    // LOGIN REAL CON BACKEND
    // ==========================================

    if (loginForm) {

        loginForm.addEventListener('submit', async (e) => {

            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            const btnSubmit = loginForm.querySelector('button[type="submit"]');

            if (loginAlert) {
                loginAlert.classList.add('d-none');
            }

            if (!username || !password) {

                showLoginError(
                    'Username and password are required.'
                );

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
                    {
                        username,
                        password
                    }
                );

                const authData = response?.data;

                const token = authData?.token;
                const backendUser = authData?.user;

                if (!token || !backendUser) {

                    throw new Error(
                        'Invalid authentication response from server.'
                    );

                }

                const userData = {
                    username: backendUser.username,
                    name: backendUser.fullName,
                    role: backendUser.role
                };

                sessionStorage.setItem('nova_token', token);

                sessionStorage.setItem(
                    'nova_user',
                    JSON.stringify(userData)
                );

                window.location.href = 'app.html';

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
    // PROTEGER LA APLICACIÓN
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

            if (userNameEl) {

                userNameEl.innerText =
                    userData.name || userData.username;

            }

        } catch (error) {

            console.error('Invalid session data:', error);

            sessionStorage.removeItem('nova_token');
            sessionStorage.removeItem('nova_user');

            window.location.replace('index.html');

        }

    }


    // ==========================================
    // ACTUALIZACIÓN DE IDIOMA
    // ==========================================

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
                'Invalid username or password.'
            );

        }

    });

});
