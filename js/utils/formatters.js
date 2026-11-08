
const Formatters = {
    formatDateISO: (dateString) => {
        if (!dateString) return '--';

        const d = new Date(dateString);

        if (Number.isNaN(d.getTime())) return '--';

        const language = typeof window.getCurrentLanguage === 'function'
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
        }).format(d);

        return `${formattedDate} UTC`;
    },

    getSeverityColor: (severity) => {
        const colors = {
            'Critical': '#EF4444',
            'High': '#F97316',
            'Medium': '#EAB308',
            'Low': '#06B6D4'
        };

        return colors[severity] || '#94A3B8';
    },

    translateSeverity: (severity) => {
        const translations = {
            Critical: 'critical',
            High: 'high',
            Medium: 'medium',
            Low: 'low'
        };

        const key = translations[severity];

        if (!key) return severity;

        return typeof window.t === 'function'
            ? window.t(key, severity)
            : severity;
    },

    createSeverityBadge: (severity) => {
        const color = Formatters.getSeverityColor(severity);
        const label = Formatters.translateSeverity(severity);

        return `
            <span
                class="badge"
                style="background-color: ${color}20; color: ${color}; border: 1px solid ${color};">
                ${label}
            </span>
        `;
    }
};

window.Formatters = Formatters;
