
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', initializeAuth, {
        once: true
    });

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
                    ${translate('authenticating', 'Authenticating...')}
                `;
            } else {
                button.textContent = translate(
                    'establishSecureSession',
                    'Establish Secure Session'
                );
            }
        }

        function clearLocalSession() {
            sessionStorage.removeItem('nova_token');
            sessionStorage.removeItem('nova_user');
            sessionStorage.removeItem('nova_selected_incident_id');
        }

        function saveUserSession(userData) {
            const normalizedUser = {
                username: userData.username,
                name: userData.fullName || userData.name || userData.username,
                role: userData.role || ''
            };

            sessionStorage.setItem(
                'nova_user',
                JSON.stringify(normalizedUser)
            );

            // Compatible with a backend that also returns a JWT.
            if (userData.token) {
                sessionStorage.setItem('nova_token', userData.token);
            } else {
                sessionStorage.removeItem('nova_token');
            }

            return normalizedUser;
        }

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
                console.error('Invalid stored user session:', error);
                return null;
            }
        }

        function redirectToLogin() {
            clearLocalSession();

            if (!window.location.pathname.endsWith('/index.html') &&
                !window.location.pathname.endsWith('/')) {
                window.location.replace('index.html');
            }
        }

        function isAppPage() {
            return window.location.pathname.endsWith('/app.html') ||
                window.location.pathname === 'app.html';
        }

        function updateUserProfile(userData) {
            if (userNameElement) {
                userNameElement.textContent =
                    userData.name || userData.username || 'Usuario';
            }

            if (userRoleElement) {
                userRoleElement.textContent = userData.role || '';
            }
        }

        // =========================================================
        // LOGIN
        // =========================================================

        async function handleLogin(event) {
            event.preventDefault();

            if (loginInProgress) return;

            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');

            if (!usernameInput || !passwordInput) {
                showLoginError(
                    'Login form fields are not available.'
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
                        'Username and password are required.'
                    )
                );
                return;
            }

            loginInProgress = true;
            setLoginLoading(true);

            try {
                const response = await HttpClient.post(
                    ENDPOINTS.AUTH.LOGIN,
                    {
                        username,
                        password
                    }
                );

                const authData = response?.data;

                // The current AuthController returns the user directly.
                // Also accepts a nested user if the backend changes later.
                const backendUser = authData?.user || authData;

                if (
                    !backendUser ||
                    typeof backendUser.username !== 'string' ||
                    !backendUser.username.trim()
                ) {
                    throw new Error(
                        translate(
                            'invalidAuthenticationResponse',
                            'The server returned an invalid authentication response.'
                        )
                    );
                }

                saveUserSession(backendUser);

                window.location.replace('app.html');

            } catch (error) {
                console.error('Login error:', error);

                clearLocalSession();

                if (error.status === 401 || error.status === 403) {
                    showLoginError(
                        translate(
                            'invalidCredentials',
                            'Invalid username or password.'
                        )
                    );
                } else {
                    showLoginError(
                        error.message ||
                        translate(
                            'connectionError',
                            'Unable to connect to the server.'
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
                if (sessionStorage.getItem('nova_user')) {
                    await HttpClient.post(
                        ENDPOINTS.AUTH.LOGOUT,
                        {}
                    );
                }

            } catch (error) {
                console.warn('Backend logout failed:', error);

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

            const userData = getStoredUser();

            if (!userData) {
                redirectToLogin();
                return;
            }

            updateUserProfile(userData);
        }

        // =========================================================
        // LOGIN PAGE SESSION
        // =========================================================

        function handleExistingSession() {
            if (!loginForm) return;

            const userData = getStoredUser();

            if (userData) {
                window.location.replace('app.html');
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

        loginForm?.addEventListener('submit', handleLogin);

        btnLogout?.addEventListener('click', logout);
        btnProfileLogout?.addEventListener('click', logout);

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

})();
