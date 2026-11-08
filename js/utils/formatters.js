
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
        // RELATIVE DATE FORMATTING
        // =========================================================

        formatRelativeDate(dateString) {
            if (!dateString) return '--';

            const date = new Date(dateString);

            if (Number.isNaN(date.getTime())) {
                return '--';
            }

            const now = new Date();
            const difference = date.getTime() - now.getTime();

            const seconds = Math.round(
                difference / 1000
            );

            const minutes = Math.round(
                seconds / 60
            );

            const hours = Math.round(
                minutes / 60
            );

            const days = Math.round(
                hours / 24
            );

            const relativeTime = new Intl.RelativeTimeFormat(
                getLocale(),
                {
                    numeric: 'auto'
                }
            );

            if (Math.abs(seconds) < 60) {
                return relativeTime.format(seconds, 'second');
            }

            if (Math.abs(minutes) < 60) {
                return relativeTime.format(minutes, 'minute');
            }

            if (Math.abs(hours) < 24) {
                return relativeTime.format(hours, 'hour');
            }

            return relativeTime.format(days, 'day');
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

            return translate(key, normalizedSeverity);
        },

        // =========================================================
        // STATUS TRANSLATION
        // =========================================================

        translateStatus(status) {
            const translations = {
                NEW: 'new',
                OPEN: 'open',
                IN_PROGRESS: 'inProgress',
                UNDER_INVESTIGATION: 'underInvestigation',
                ESCALATED: 'escalated',
                RESOLVED: 'resolved',
                CLOSED: 'closed',
                FALSE_POSITIVE: 'falsePositive',
                TRUE_POSITIVE_CONFIRMED: 'truePositiveConfirmed',
                TRUE_POSITIVE_MITIGATED: 'truePositiveMitigated',
                INCONCLUSIVE: 'inconclusive',
                ACTIVE: 'active',
                DISABLED: 'disabled',
                PENDING: 'pending'
            };

            const normalizedStatus = String(
                status ?? ''
            ).trim().toUpperCase();

            const key = translations[normalizedStatus];

            if (!key) {
                return status || '--';
            }

            return translate(key, normalizedStatus);
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
        // STATUS BADGE
        // =========================================================

        createStatusBadge(status) {
            const normalizedStatus = this.normalizeStatus(status);
            const label = this.translateStatus(status);

            const colors = {
                NEW: '#06B6D4',
                OPEN: '#06B6D4',
                IN_PROGRESS: '#EAB308',
                UNDER_INVESTIGATION: '#F97316',
                ESCALATED: '#EF4444',
                RESOLVED: '#22C55E',
                CLOSED: '#22C55E',
                FALSE_POSITIVE: '#94A3B8',
                ACTIVE: '#22C55E',
                DISABLED: '#94A3B8',
                PENDING: '#EAB308'
            };

            const color = colors[normalizedStatus] || '#94A3B8';

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
        },

        // =========================================================
        // NUMBER FORMATTING
        // =========================================================

        formatNumber(value, maximumFractionDigits = 0) {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return '--';
            }

            return new Intl.NumberFormat(getLocale(), {
                maximumFractionDigits
            }).format(number);
        },

        // =========================================================
        // PERCENTAGE FORMATTING
        // =========================================================

        formatPercentage(value, maximumFractionDigits = 1) {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return '--';
            }

            return `${this.formatNumber(
                number,
                maximumFractionDigits
            )}%`;
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

    function translate(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback) || fallback
            : fallback;
    }

    // =========================================================
    // GLOBAL EXPORT
    // =========================================================

    window.Formatters = Formatters;

})();
