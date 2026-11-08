
const Formatters = {

    // =========================================================
    // DATE FORMATTING
    // =========================================================

    formatDateISO: (dateString) => {
        if (!dateString) return '--';

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return '--';
        }

        const language =
            typeof window.getCurrentLanguage === 'function'
                ? window.getCurrentLanguage()
                : 'en';

        const locale = language === 'es' ? 'es-CO' : 'en-US';

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

    formatDateLocal: (dateString) => {
        if (!dateString) return '--';

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return '--';
        }

        const language =
            typeof window.getCurrentLanguage === 'function'
                ? window.getCurrentLanguage()
                : 'es';

        const locale = language === 'es' ? 'es-CO' : 'en-US';

        return new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium',
            timeStyle: 'medium'
        }).format(date);
    },

    // =========================================================
    // SEVERITY COLORS
    // =========================================================

    getSeverityColor: (severity) => {
        const colors = {
            CRITICAL: '#EF4444',
            HIGH: '#F97316',
            MEDIUM: '#EAB308',
            LOW: '#06B6D4',
            INFO: '#94A3B8'
        };

        const normalizedSeverity = String(
            severity || ''
        ).trim().toUpperCase();

        return colors[normalizedSeverity] || '#94A3B8';
    },

    // =========================================================
    // SEVERITY TRANSLATION
    // =========================================================

    translateSeverity: (severity) => {
        const translations = {
            CRITICAL: 'critical',
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low',
            INFO: 'info'
        };

        const normalizedSeverity = String(
            severity || ''
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

    escapeHTML: (value) => {
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

    createSeverityBadge: (severity) => {
        const color = Formatters.getSeverityColor(severity);
        const label = Formatters.translateSeverity(severity);

        return `
            <span
                class="badge"
                style="
                    background-color: ${color}20;
                    color: ${color};
                    border: 1px solid ${color};
                ">
                ${Formatters.escapeHTML(label)}
            </span>
        `;
    },

    // =========================================================
    // GENERIC STATUS NORMALIZATION
    // =========================================================

    normalizeStatus: (status) => {
        return String(status || '')
            .trim()
            .toUpperCase();
    }
};

// =========================================================
// GLOBAL EXPORT
// =========================================================

window.Formatters = Formatters;
