
const DOMUtils = {
    createElement: (tag, className = '', innerHTML = '') => {
        const el = document.createElement(tag);

        if (className) {
            el.className = className;
        }

        if (innerHTML) {
            el.innerHTML = innerHTML;
        }

        return el;
    },

    showToast: (message, type = 'info') => {
        let toastContainer = document.getElementById('nova-toast-container');

        if (!toastContainer) {
            toastContainer = DOMUtils.createElement(
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

        const toastEl = DOMUtils.createElement(
            'div',
            'toast align-items-center text-white border-1'
        );

        toastEl.style.backgroundColor = theme.bg;
        toastEl.style.borderColor = theme.border;

        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');

        const wrapper = document.createElement('div');
        wrapper.className = 'd-flex';

        const body = document.createElement('div');
        body.className = 'toast-body fw-semibold';

        // El mensaje se inserta como texto para evitar interpretar HTML.
        body.textContent = String(message);

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close btn-close-white me-2 m-auto';
        closeButton.setAttribute('data-bs-dismiss', 'toast');
        closeButton.setAttribute('aria-label',
            typeof window.t === 'function'
                ? window.t('close', 'Close')
                : 'Close'
        );

        wrapper.appendChild(body);
        wrapper.appendChild(closeButton);
        toastEl.appendChild(wrapper);

        toastContainer.appendChild(toastEl);

        const bsToast = new bootstrap.Toast(toastEl, {
            autohide: true,
            delay: 3500
        });

        bsToast.show();

        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }
};

window.DOMUtils = DOMUtils;
