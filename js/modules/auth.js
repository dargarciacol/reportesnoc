
(function () {
    'use strict';

    function initializeAuth() {

        // =========================================================
        // DOM
        // =========================================================

        const loginForm = document.getElementById('loginForm');
        const loginAlert = document.getElementById('loginAlert');

        const btnLogout = document.getElementById('btnLogout');
        const btnProfileLogout = document.getElementById('btnProfileLogout');
        const btnProfile = document.getElementById('btnProfile');

        const userNameElement = document.getElementById('user-name');
        const userRoleElement = document.getElementById('user-role');

        // =========================================================
        // STATE
        // =========================================================

        let loginInProgress = false;
        let logoutInProgress = false;

        // =========================================================
        // HELPERS
        // =========================================================

        function translate(key, fallback) {
            return typeof window.t === 'function'
                ? window.t(key, fallback) || fallback
                : fallback;
        }

        function showLoginError(message) {
            if (!loginAlert) return;

            loginAlert.textContent = message;
            loginAlert.classList.remove('d-none');
        }

        function hideLoginError() {
            loginAlert?.classList.add('d-none');
        }

        function setLoginLoading(loading) {
            const button = loginForm?.querySelector(
                'button[type="submit"]'
            );

            if (!button) return;

            button.disabled = loading;

            if (loading) {
                button.innerHTML = `
                    <span
                        class="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true">
                    </span>
                    ${translate('authenticating', 'Autenticando...')}
                `;
            } else {
                button.textContent = translate(
                    'establishSecureSession',
                    'Establecer sesión segura'
                );
            }
        }

        function clearLocalSession() {
            sessionStorage.removeItem('nova_token');
            sessionStorage.removeItem('nova_user');
            sessionStorage.removeItem('nova_selected_incident_id');

            window.NOVA_CURRENT_USER = null;
        }

        // =========================================================
        // SAVE SESSION
        // =========================================================

        function saveUserSession(userData, token) {

            if (!token || typeof token !== 'string' || !token.trim()) {
                throw new Error(
                    'El servidor no proporcionó un token JWT válido.'
                );
            }

            if (!userData || !userData.username) {
                throw new Error(
                    'El servidor no proporcionó información válida del usuario.'
                );
            }

            const normalizedUser = {
                username: userData.username,
                name: userData.fullName ||
                    userData.name ||
                    userData.username,
                role: userData.role || ''
            };

            // Guardar JWT
            sessionStorage.setItem(
                'nova_token',
                token
            );

            // Guardar información del usuario
            sessionStorage.setItem(
                'nova_user',
                JSON.stringify(normalizedUser)
            );

            // Usuario disponible para los módulos
            window.NOVA_CURRENT_USER = normalizedUser;

            return normalizedUser;
        }

        // =========================================================
        // GET STORED USER
        // =========================================================

        function getStoredUser() {

            const storedUser = sessionStorage.getItem('nova_user');

            if (!storedUser) return null;

            try {
                const user = JSON.parse(storedUser);

                if (!user || typeof user.username !== 'string') {
                    return null;
                }

                return user;

            } catch (error) {
                console.error(
                    'NOVA SIEM: Sesión de usuario inválida:',
                    error
                );

                return null;
            }
        }

        // =========================================================
        // SESSION VALIDATION
        // =========================================================

        function hasValidLocalSession() {

            const token = sessionStorage.getItem('nova_token');
            const user = getStoredUser();

            return Boolean(
                token &&
                token.trim() &&
                user
            );
        }

        // =========================================================
        // REDIRECT
        // =========================================================

        function redirectToLogin() {

            clearLocalSession();

            if (!window.location.pathname.endsWith('/index.html') &&
                !window.location.pathname.endsWith('/')) {

                window.location.replace('index.html');
            }
        }

        function isAppPage() {
            return window.location.pathname.endsWith('/app.html');
        }

        // =========================================================
        // PROFILE
        // =========================================================

        function updateUserProfile(userData) {

            if (userNameElement) {
                userNameElement.textContent =
                    userData.name ||
                    userData.username ||
                    'Usuario';
            }

            if (userRoleElement) {
                userRoleElement.textContent =
                    userData.role || '';
            }
        }

        // =========================================================
        // LOGIN
        // =========================================================

        async function handleLogin(event) {

            event.preventDefault();

            if (loginInProgress) return;

            const usernameInput =
                document.getElementById('username');

            const passwordInput =
                document.getElementById('password');

            if (!usernameInput || !passwordInput) {
                showLoginError(
                    'Los campos de inicio de sesión no están disponibles.'
                );
                return;
            }

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            hideLoginError();

            if (!username || !password) {
                showLoginError(
                    translate(
                        'credentialsRequired',
                        'El usuario y la contraseña son obligatorios.'
                    )
                );
                return;
            }

            loginInProgress = true;
            setLoginLoading(true);

            try {

                clearLocalSession();

                const response = await HttpClient.post(
                    ENDPOINTS.AUTH.LOGIN,
                    {
                        username,
                        password
                    }
                );

                // Estructura real de AuthController:
                // response.data.token
                // response.data.user

                const authData = response?.data;

                const token = authData?.token;
                const backendUser = authData?.user;

                if (!token) {
                    throw new Error(
                        'El backend no devolvió el token JWT.'
                    );
                }

                if (!backendUser?.username) {
                    throw new Error(
                        'El backend no devolvió los datos del usuario.'
                    );
                }

                // Guardar usuario y token correctamente
                saveUserSession(
                    backendUser,
                    token
                );

                console.info(
                    'NOVA SIEM: Autenticación completada correctamente.'
                );

                window.location.replace('app.html');

            } catch (error) {

                console.error(
                    'NOVA SIEM: Error de autenticación:',
                    error
                );

                clearLocalSession();

                if (error.status === 401 || error.status === 403) {

                    showLoginError(
                        translate(
                            'invalidCredentials',
                            'Usuario o contraseña incorrectos.'
                        )
                    );

                } else {

                    showLoginError(
                        error.message ||
                        translate(
                            'connectionError',
                            'No fue posible conectar con el servidor.'
                        )
                    );
                }

            } finally {

                loginInProgress = false;
                setLoginLoading(false);
            }
        }

        // =========================================================
        // LOGOUT
        // =========================================================

        async function logout() {

            if (logoutInProgress) return;

            logoutInProgress = true;

            if (btnLogout) {
                btnLogout.disabled = true;
            }

            if (btnProfileLogout) {
                btnProfileLogout.disabled = true;
            }

            try {

                if (sessionStorage.getItem('nova_token')) {

                    await HttpClient.post(
                        ENDPOINTS.AUTH.LOGOUT,
                        {}
                    );
                }

            } catch (error) {

                console.warn(
                    'NOVA SIEM: Error al cerrar sesión en el backend:',
                    error
                );

            } finally {

                clearLocalSession();

                window.location.replace('index.html');
            }
        }

        // =========================================================
        // APPLICATION ACCESS
        // =========================================================

        function protectApplication() {

            if (!isAppPage()) return;

            if (!hasValidLocalSession()) {

                redirectToLogin();
                return;
            }

            const userData = getStoredUser();

            window.NOVA_CURRENT_USER = userData;

            updateUserProfile(userData);
        }

        // =========================================================
        // LOGIN PAGE SESSION
        // =========================================================

        function handleExistingSession() {

            if (!loginForm) return;

            if (hasValidLocalSession()) {
                window.location.replace('app.html');
            } else {
                clearLocalSession();
            }
        }

        // =========================================================
        // LANGUAGE
        // =========================================================

        function handleLanguageChanged() {

            if (loginForm && !loginInProgress) {
                setLoginLoading(false);
            }
        }

        // =========================================================
        // EVENT LISTENERS
        // =========================================================

        loginForm?.addEventListener(
            'submit',
            handleLogin
        );

        btnLogout?.addEventListener(
            'click',
            logout
        );

        btnProfileLogout?.addEventListener(
            'click',
            logout
        );

        btnProfile?.addEventListener('click', event => {
            event.preventDefault();
        });

        document.addEventListener(
            'nova:languageChanged',
            handleLanguageChanged
        );

        // =========================================================
        // INITIALIZATION
        // =========================================================

        protectApplication();
        handleExistingSession();
    }

    if (document.readyState === 'loading') {

        document.addEventListener(
            'DOMContentLoaded',
            initializeAuth,
            { once: true }
        );

    } else {

        initializeAuth();
    }

})();
