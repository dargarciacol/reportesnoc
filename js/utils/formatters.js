
(function () {
    'use strict';

    const Formatters = {

        // =========================================================
        // DATE FORMATTING (UTC)
        // =========================================================

        formatDateISO(dateString) {
            if (!dateString) return '--';

            const date = new Date(dateString);

            if (Number.isNaN(date.getTime())) {
                return '--';
            }

            const locale = getLocale();

            const formattedDate = new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'UTC'
            }).format(date);

            return `${formattedDate} UTC`;
        },

        // =========================================================
        // LOCAL DATE FORMATTING
        // =========================================================

        formatDateLocal(dateString) {
            if (!dateString) return '--';

            const date = new Date(dateString);

            if (Number.isNaN(date.getTime())) {
                return '--';
            }

            return new Intl.DateTimeFormat(getLocale(), {
                dateStyle: 'medium',
                timeStyle: 'medium'
            }).format(date);
        },

        // =========================================================
        // SEVERITY COLORS
        // =========================================================

        getSeverityColor(severity) {
            const colors = {
                CRITICAL: '#EF4444',
                HIGH: '#F97316',
                MEDIUM: '#EAB308',
                LOW: '#06B6D4',
                INFO: '#94A3B8'
            };

            const normalizedSeverity = String(
                severity ?? ''
            ).trim().toUpperCase();

            return colors[normalizedSeverity] || '#94A3B8';
        },

        // =========================================================
        // SEVERITY TRANSLATION
        // =========================================================

        translateSeverity(severity) {
            const translations = {
                CRITICAL: 'critical',
                HIGH: 'high',
                MEDIUM: 'medium',
                LOW: 'low',
                INFO: 'info'
            };

            const normalizedSeverity = String(
                severity ?? ''
            ).trim().toUpperCase();

            const key = translations[normalizedSeverity];

            if (!key) {
                return severity || '--';
            }

            return typeof window.t === 'function'
                ? window.t(key, normalizedSeverity) || normalizedSeverity
                : normalizedSeverity;
        },

        // =========================================================
        // HTML ESCAPING
        // =========================================================

        escapeHTML(value) {
            return String(value ?? '').replace(/[&<>"']/g, char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            })[char]);
        },

        // =========================================================
        // SEVERITY BADGE
        // =========================================================

        createSeverityBadge(severity) {
            const color = this.getSeverityColor(severity);
            const label = this.translateSeverity(severity);

            return `
                <span
                    class="badge"
                    style="
                        background-color: ${color}20;
                        color: ${color};
                        border: 1px solid ${color};
                    ">
                    ${this.escapeHTML(label)}
                </span>
            `;
        },

        // =========================================================
        // GENERIC STATUS NORMALIZATION
        // =========================================================

        normalizeStatus(status) {
            return String(status ?? '')
                .trim()
                .toUpperCase();
        }
    };

    // =========================================================
    // INTERNAL HELPERS
    // =========================================================

    function getLocale() {
        const language =
            typeof window.getCurrentLanguage === 'function'
                ? window.getCurrentLanguage()
                : 'es';

        return language === 'es' ? 'es-CO' : 'en-US';
    }

    // =========================================================
    // GLOBAL EXPORT
    // =========================================================

    window.Formatters = Formatters;

})();
