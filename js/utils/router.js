
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', initializeRouter, {
        once: true
    });

    function initializeRouter() {

        const contentArea = document.getElementById('nova-content');
        const breadcrumb = document.getElementById('breadcrumb');

        if (!contentArea || !breadcrumb) {
            console.error('NOVA SIEM: Router elements not found.');
            return;
        }

        let currentModuleScript = null;
        let navigationCounter = 0;

        // ==========================================
        // ROUTES
        // ==========================================

        function validateRoute(route) {

            if (!route || !/^[a-zA-Z0-9_-]+$/.test(route)) {
                return 'dashboard';
            }

            return route.toLowerCase();
        }

        function getRouteFromURL() {

            const params = new URLSearchParams(window.location.search);

            return validateRoute(params.get('page'));
        }

        // ==========================================
        // NAVIGATION UI
        // ==========================================

        function updateActiveLink(route) {

            document.querySelectorAll('.nav-link[data-route]')
                .forEach(link => {

                    link.classList.toggle(
                        'active',
                        link.dataset.route === route
                    );
                });
        }

        function updateBreadcrumb(route) {

            const label = route
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, char => char.toUpperCase());

            breadcrumb.innerHTML = `
                NOVA SIEM /
                <span style="color: var(--text-main);">
                    ${label}
                </span>
            `;
        }

        function translateCurrentPage() {

            if (typeof window.translatePage === 'function') {
                window.translatePage();
            }
        }

        // ==========================================
        // LOADING
        // ==========================================

        function showLoading() {

            const message = typeof window.t === 'function'
                ? window.t('loading', 'Loading module...')
                : 'Loading module...';

            contentArea.innerHTML = `
                <div class="d-flex justify-content-center align-items-center p-5">
                    <div class="spinner-border text-primary" role="status"></div>
                    <span class="ms-3 text-muted">${message}</span>
                </div>
            `;
        }

        // ==========================================
        // MODULE CLEANUP
        // ==========================================

        function cleanupCurrentModule() {

            if (typeof window.destroyCurrentModule === 'function') {

                try {
                    window.destroyCurrentModule();
                } catch (error) {
                    console.error('Module cleanup error:', error);
                }
            }

            window.destroyCurrentModule = null;

            if (currentModuleScript) {
                currentModuleScript.remove();
                currentModuleScript = null;
            }
        }

        // ==========================================
        // LOAD HTML
        // ==========================================

        async function loadHTML(route) {

            const response = await fetch(`pages/${route}.html`);

            if (!response.ok) {
                throw new Error(
                    `Page not found: pages/${route}.html (${response.status})`
                );
            }

            return await response.text();
        }

        // ==========================================
        // LOAD JAVASCRIPT MODULE
        // ==========================================

        function loadModuleScript(route) {

            return new Promise((resolve, reject) => {

                const script = document.createElement('script');

                script.src = `js/modules/${route}.js`;
                script.id = 'dynamic-module-script';
                script.async = false;

                currentModuleScript = script;

                script.onload = () => resolve();

                script.onerror = () => {

                    script.remove();

                    if (currentModuleScript === script) {
                        currentModuleScript = null;
                    }

                    reject(
                        new Error(
                            `JavaScript module not found: js/modules/${route}.js`
                        )
                    );
                };

                document.body.appendChild(script);
            });
        }

        // ==========================================
        // ERROR HANDLER
        // ==========================================

        function showError(route, error) {

            console.error(`NOVA SIEM Router: ${route}`, error);

            contentArea.innerHTML = `
                <div class="alert alert-danger bg-dark text-danger border-danger">
                    <h5>
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Error loading module
                    </h5>

                    <p>
                        Unable to load:
                        <strong>${route}</strong>
                    </p>

                    <small>${error.message}</small>

                    <div class="mt-3">
                        <button id="retry-module"
                                class="btn btn-outline-danger btn-sm">
                            <i class="bi bi-arrow-clockwise me-1"></i>
                            Retry
                        </button>
                    </div>
                </div>
            `;

            document.getElementById('retry-module')
                ?.addEventListener('click', () => loadModule(route));
        }

        // ==========================================
        // MAIN MODULE LOADER
        // ==========================================

        async function loadModule(route, updateURL = true) {

            route = validateRoute(route);

            const navigationId = ++navigationCounter;

            cleanupCurrentModule();
            showLoading();

            try {

                // 1. Load HTML
                const html = await loadHTML(route);

                if (navigationId !== navigationCounter) {
                    return;
                }

                // 2. Insert HTML
                contentArea.innerHTML = html;

                // 3. Update interface
                updateBreadcrumb(route);
                updateActiveLink(route);

                // 4. Update browser URL
                if (updateURL) {

                    const url = new URL(window.location.href);

                    url.searchParams.set('page', route);

                    window.history.pushState(
                        { page: route },
                        '',
                        url
                    );
                }

                // 5. Apply translations
                translateCurrentPage();

                // 6. Load page JavaScript
                await loadModuleScript(route);

                if (navigationId !== navigationCounter) {
                    return;
                }

                console.info(
                    `NOVA SIEM: ${route} loaded successfully.`
                );

            } catch (error) {

                if (navigationId !== navigationCounter) {
                    return;
                }

                cleanupCurrentModule();
                showError(route, error);
            }
        }

        // ==========================================
        // SIDEBAR NAVIGATION
        // ==========================================

        document.addEventListener('click', event => {

            const link = event.target.closest(
                '.nav-link[data-route]'
            );

            if (!link) {
                return;
            }

            event.preventDefault();

            loadModule(link.dataset.route);
        });

        // ==========================================
        // BROWSER BACK / FORWARD
        // ==========================================

        window.addEventListener('popstate', () => {

            loadModule(getRouteFromURL(), false);
        });

        // ==========================================
        // GLOBAL API
        // ==========================================

        window.NOVA = window.NOVA || {};

        window.NOVA.navigate = route => {
            loadModule(route);
        };

        window.NOVA.reload = () => {
            loadModule(getRouteFromURL(), false);
        };

        window.NOVA.getCurrentPage = getRouteFromURL;

        // ==========================================
        // INITIAL PAGE
        // ==========================================

        loadModule(getRouteFromURL(), false);
    }

})();
