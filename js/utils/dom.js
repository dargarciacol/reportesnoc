
(function () {
    'use strict';

    // =========================================================
    // TRANSLATION HELPER
    // =========================================================

    function getTranslation(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback) || fallback
            : fallback;
    }

    // =========================================================
    // CLEANUP HELPERS
    // =========================================================

    function removeEmptyContainer(container) {
        if (
            container &&
            container.isConnected &&
            !container.children.length
        ) {
            container.remove();
        }
    }

    // =========================================================
    // DOM UTILITIES
    // =========================================================

    const DOMUtils = {

        // =====================================================
        // CREATE ELEMENT
        // =====================================================

        createElement(tag, className = '', innerHTML = '') {
            if (
                typeof tag !== 'string' ||
                !tag.trim()
            ) {
                throw new TypeError(
                    'A valid HTML tag is required.'
                );
            }

            const element = document.createElement(tag);

            if (className) {
                element.className = className;
            }

            // Mantiene compatibilidad con el contrato original.
            // Para texto dinámico, utilizar textContent directamente.
            if (innerHTML !== '') {
                element.innerHTML = String(innerHTML);
            }

            return element;
        },

        // =====================================================
        // TOAST NOTIFICATIONS
        // =====================================================

        showToast(message, type = 'info') {
            if (!document.body) {
                console.error(
                    'DOMUtils: document.body is not available.'
                );
                return;
            }

            let toastContainer = document.getElementById(
                'nova-toast-container'
            );

            if (!toastContainer) {
                toastContainer = this.createElement(
                    'div',
                    'toast-container position-fixed bottom-0 end-0 p-3'
                );

                toastContainer.id = 'nova-toast-container';
                toastContainer.style.zIndex = '1090';

                document.body.appendChild(toastContainer);
            }

            const colors = {
                success: {
                    bg: 'rgba(34, 197, 94, 0.9)',
                    border: '#22C55E'
                },

                danger: {
                    bg: 'rgba(239, 68, 68, 0.9)',
                    border: '#EF4444'
                },

                info: {
                    bg: 'rgba(6, 182, 212, 0.9)',
                    border: '#06B6D4'
                },

                warning: {
                    bg: 'rgba(234, 179, 8, 0.9)',
                    border: '#EAB308'
                }
            };

            const theme = colors[type] || colors.info;

            const toastEl = this.createElement(
                'div',
                'toast align-items-center text-white border-1'
            );

            toastEl.style.backgroundColor = theme.bg;
            toastEl.style.borderColor = theme.border;

            toastEl.setAttribute('role', 'alert');
            toastEl.setAttribute('aria-live', 'assertive');
            toastEl.setAttribute('aria-atomic', 'true');

            // Contenedor principal.
            const wrapper = document.createElement('div');
            wrapper.className = 'd-flex';

            // Contenido del mensaje.
            const body = document.createElement('div');
            body.className = 'toast-body fw-semibold';
            body.textContent = String(message ?? '');

            // Botón para cerrar.
            const closeButton = document.createElement('button');

            closeButton.type = 'button';
            closeButton.className =
                'btn-close btn-close-white me-2 m-auto';

            closeButton.setAttribute(
                'aria-label',
                getTranslation('close', 'Close')
            );

            wrapper.appendChild(body);
            wrapper.appendChild(closeButton);

            toastEl.appendChild(wrapper);
            toastContainer.appendChild(toastEl);

            // =================================================
            // BOOTSTRAP INTEGRATION
            // =================================================

            if (
                window.bootstrap &&
                typeof window.bootstrap.Toast === 'function'
            ) {
                const bsToast = new window.bootstrap.Toast(
                    toastEl,
                    {
                        autohide: true,
                        delay: 3500
                    }
                );

                closeButton.addEventListener('click', () => {
                    bsToast.hide();
                });

                toastEl.addEventListener(
                    'hidden.bs.toast',
                    () => {
                        bsToast.dispose();
                        toastEl.remove();

                        removeEmptyContainer(toastContainer);
                    },
                    { once: true }
                );

                bsToast.show();

                return;
            }

            // =================================================
            // FALLBACK WITHOUT BOOTSTRAP
            // =================================================

            toastEl.classList.add('show');

            closeButton.addEventListener('click', () => {
                toastEl.remove();
                removeEmptyContainer(toastContainer);
            });

            // El temporizador verifica que el elemento
            // siga conectado antes de eliminarlo.
            window.setTimeout(() => {
                if (!toastEl.isConnected) return;

                toastEl.remove();
                removeEmptyContainer(toastContainer);
            }, 3500);
        }
    };

    // =========================================================
    // GLOBAL EXPORT
    // =========================================================

    window.DOMUtils = DOMUtils;

})();
