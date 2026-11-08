
document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('nova-content');
    const navLinks = document.querySelectorAll('.nav-link');
    const breadcrumb = document.getElementById('breadcrumb');

    // Aplica el idioma seleccionado al contenido actual.
    function applyCurrentLanguage() {
        if (typeof translatePage === 'function') {
            const language = typeof getCurrentLanguage === 'function'
                ? getCurrentLanguage()
                : 'es';

            translatePage(language);
        }
    }

    // Carga los módulos del sistema.
    async function loadModule(route) {
        try {
            const response = await fetch(`pages/${route}.html`);

            if (!response.ok) {
                throw new Error(`Module not found: ${route}`);
            }

            const html = await response.text();

            // Inserta el contenido HTML.
            contentArea.innerHTML = html;

            // Actualiza el breadcrumb con una clave traducible.
            const routeLabel = route.charAt(0).toUpperCase() + route.slice(1);

            breadcrumb.innerHTML = `
                NOVA SIEM /
                <span data-i18n="${route}" style="color: var(--text-main);">
                    ${routeLabel}
                </span>
            `;

            // Aplica las traducciones al módulo recién cargado.
            applyCurrentLanguage();

            // Elimina el script del módulo anterior.
            const existingScript = document.getElementById('dynamic-module-script');

            if (existingScript) {
                existingScript.remove();
            }

            // Carga el JavaScript correspondiente al módulo.
            const script = document.createElement('script');

            script.src = `js/modules/${route}.js`;
            script.id = 'dynamic-module-script';
            script.async = false;

            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(
                    new Error(`Error loading script: ${route}.js`)
                );

                document.body.appendChild(script);
            });

        } catch (error) {
            console.error('Router error:', error);

            contentArea.innerHTML = `
                <div class="alert alert-danger bg-dark text-danger border-danger">
                    Error loading module: ${route}
                </div>
            `;

            applyCurrentLanguage();
        }
    }

    // Navegación entre módulos.
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();

            navLinks.forEach(navLink => {
                navLink.classList.remove('active');
            });

            event.currentTarget.classList.add('active');

            const route = event.currentTarget.getAttribute('data-route');

            loadModule(route);
        });
    });

    // Módulo inicial.
    loadModule('dashboard');
});
