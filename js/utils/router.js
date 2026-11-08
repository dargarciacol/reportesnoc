
(function () {
    'use strict';

    const routerScript = document.currentScript;

    const APP_ROOT_URL = routerScript
        ? new URL('../../', routerScript.src)
        : new URL('./', window.location.href);

    function initializeRouter() {

        const contentArea = document.getElementById('nova-content');
        const breadcrumb = document.getElementById('breadcrumb');

        if (!contentArea || !breadcrumb) {
            console.error(
                'NOVA SIEM: No se encontraron #nova-content o #breadcrumb.'
            );
            return;
        }

        let currentModuleScript = null;
        let navigationCounter = 0;
        let currentRoute = null;

        // ==========================================
        // HELPERS
        // ==========================================

        function escapeHTML(value) {
            return String(value ?? '').replace(/[&<>"']/g, char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            })[char]);
        }

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

        function getPageURL(route) {
            return new URL(
                `pages/${route}.html`,
                APP_ROOT_URL
            ).href;
        }

        function getModuleURL(route) {
            return new URL(
                `js/modules/${route}.js`,
                APP_ROOT_URL
            ).href;
        }

        function dispatchRouterEvent(eventName, route) {
            document.dispatchEvent(
                new CustomEvent(eventName, {
                    detail: { route }
                })
            );
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

            breadcrumb.textContent = `NOVA SIEM / ${label}`;
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
                ? window.t('loading', 'Cargando módulo...')
                : 'Cargando módulo...';

            const wrapper = document.createElement('div');

            wrapper.className =
                'd-flex justify-content-center align-items-center p-5';

            const spinner = document.createElement('div');
            spinner.className = 'spinner-border text-primary';
            spinner.setAttribute('role', 'status');

            const text = document.createElement('span');
            text.className = 'ms-3 text-muted';
            text.textContent = message;

            wrapper.appendChild(spinner);
            wrapper.appendChild(text);

            contentArea.replaceChildren(wrapper);
        }

        // ==========================================
        // MODULE CLEANUP
        // ==========================================

        function cleanupCurrentModule() {

            if (currentRoute) {
                dispatchRouterEvent(
                    'nova:pageUnloading',
                    currentRoute
                );
            }

            if (typeof window.destroyCurrentModule === 'function') {
                try {
                    window.destroyCurrentModule();
                } catch (error) {
                    console.error(
                        'NOVA SIEM: Error limpiando el módulo:',
                        error
                    );
                }
            }

            window.destroyCurrentModule = null;

            if (currentModuleScript) {
                currentModuleScript.remove();
                currentModuleScript = null;
            }

            currentRoute = null;
        }

        // ==========================================
        // LOAD HTML
        // ==========================================

        async function loadHTML(route) {

            const pageURL = getPageURL(route);

            console.info(
                'NOVA SIEM: Solicitando página:',
                pageURL
            );

            const response = await fetch(pageURL, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html'
                },
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error(
                    `No se encontró la página ${route}. HTTP ${response.status}. Ruta: ${pageURL}`
                );
            }

            const html = await response.text();

            if (!html.trim()) {
                throw new Error(
                    `La página ${route} está vacía.`
                );
            }

            const parser = new DOMParser();

            const parsedDocument = parser.parseFromString(
                html,
                'text/html'
            );

            if (parsedDocument.querySelector('parsererror')) {
                throw new Error(
                    `No se pudo interpretar el HTML de ${route}.`
                );
            }

            return parsedDocument.body.innerHTML;
        }

        // ==========================================
        // LOAD JAVASCRIPT MODULE
        // ==========================================

        function loadModuleScript(route) {

            return new Promise((resolve, reject) => {

                const script = document.createElement('script');

                const moduleURL = getModuleURL(route);

                script.src = moduleURL;
                script.id = 'dynamic-module-script';
                script.async = false;

                currentModuleScript = script;

                script.onload = () => {
                    resolve();
                };

                script.onerror = () => {

                    script.remove();

                    if (currentModuleScript === script) {
                        currentModuleScript = null;
                    }

                    reject(
                        new Error(
                            `No se encontró el módulo JavaScript: ${moduleURL}`
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

            const wrapper = document.createElement('div');

            wrapper.className =
                'alert alert-danger bg-dark text-danger border-danger';

            wrapper.innerHTML = `
                <h5>
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error al cargar el módulo
                </h5>

                <p>
                    No fue posible cargar:
                    <strong>${escapeHTML(route)}</strong>
                </p>

                <small>
                    ${escapeHTML(error?.message || 'Error desconocido')}
                </small>

                <div class="mt-3">
                    <button id="retry-module"
                            class="btn btn-outline-danger btn-sm">
                        <i class="bi bi-arrow-clockwise me-1"></i>
                        Reintentar
                    </button>
                </div>
            `;

            contentArea.replaceChildren(wrapper);

            document.getElementById('retry-module')
                ?.addEventListener('click', () => {
                    loadModule(route);
                });
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

                // 1. Cargar HTML
                const html = await loadHTML(route);

                if (navigationId !== navigationCounter) {
                    return;
                }

                // 2. Insertar contenido
                contentArea.innerHTML = html;

                // 3. Actualizar estado
                currentRoute = route;

                updateBreadcrumb(route);
                updateActiveLink(route);

                // 4. Actualizar URL
                if (updateURL) {

                    const url = new URL(window.location.href);

                    url.searchParams.set('page', route);

                    window.history.pushState(
                        { page: route },
                        '',
                        url
                    );
                }

                // 5. Aplicar traducciones
                translateCurrentPage();

                // 6. Cargar JavaScript
                await loadModuleScript(route);

                if (navigationId !== navigationCounter) {
                    return;
                }

                // 7. Notificar que la vista está lista
                dispatchRouterEvent(
                    'nova:pageLoaded',
                    route
                );

                console.info(
                    `NOVA SIEM: ${route} cargado correctamente.`
                );

            } catch (error) {

                if (navigationId !== navigationCounter) {
                    return;
                }

                console.error(
                    `NOVA SIEM: Error cargando ${route}:`,
                    error
                );

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

            if (!link) return;

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
            return loadModule(route);
        };

        window.NOVA.reload = () => {
            return loadModule(getRouteFromURL(), false);
        };

        window.NOVA.getCurrentPage = () => currentRoute;

        // ==========================================
        // INITIAL PAGE
        // ==========================================

        loadModule(getRouteFromURL(), false);
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initializeRouter,
            { once: true }
        );
    } else {
        initializeRouter();
    }

})();
