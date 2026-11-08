
(function () {
    'use strict';

    // ==========================================
    // CONFIGURACIÓN BASE
    // ==========================================

    const API_BASE_URL = 'https://backend-siem.onrender.com/api/v1';

    // ==========================================
    // VALIDACIÓN DE IDENTIFICADORES
    // ==========================================

    function validateId(id, name = 'ID') {
        if (
            id === null ||
            id === undefined ||
            String(id).trim() === ''
        ) {
            throw new Error(`${name} is required.`);
        }

        return encodeURIComponent(String(id));
    }

    // ==========================================
    // ENDPOINTS
    // ==========================================

    const ENDPOINTS = {

        // AUTHENTICATION
        AUTH: {
            LOGIN: `${API_BASE_URL}/auth/login`,
            LOGOUT: `${API_BASE_URL}/auth/logout`
        },

        // DASHBOARD
        DASHBOARD: {
            SUMMARY: `${API_BASE_URL}/dashboard/summary`
        },

        // DATA INGESTION
        INGEST: {
            UPLOAD_EXCEL: `${API_BASE_URL}/ingest/excel`
        },

        // SECURITY EVENTS
        EVENTS: {
            LIST: `${API_BASE_URL}/events`,

            DETAILS: (id) =>
                `${API_BASE_URL}/events/${validateId(id, 'Event ID')}`
        },

        // SECURITY ALERTS
        ALERTS: {
            LIST: `${API_BASE_URL}/alerts`,

            UPDATE_STATUS: (id) =>
                `${API_BASE_URL}/alerts/${validateId(id, 'Alert ID')}/status`
        },

        // INCIDENT MANAGEMENT
        INCIDENTS: {
            LIST: `${API_BASE_URL}/incidents`,
            CREATE: `${API_BASE_URL}/incidents`
        },

        // DETECTION RULES
        DETECTION: {
            RULES: `${API_BASE_URL}/detection/rules`,

            TOGGLE_RULE: (id) =>
                `${API_BASE_URL}/detection/rules/${validateId(id, 'Rule ID')}/toggle`
        },

        // INVESTIGATIONS
        INVESTIGATIONS: {
            BY_INCIDENT: (incidentId) =>
                `${API_BASE_URL}/investigations/incident/${validateId(incidentId, 'Incident ID')}`,

            SUBMIT_VERDICT: (id) =>
                `${API_BASE_URL}/investigations/${validateId(id, 'Investigation ID')}/verdict`
        },

        // REPORTING
        REPORTS: {
            GENERATE: `${API_BASE_URL}/reports/generate`
        }
    };

    // ==========================================
    // GLOBAL EXPORTS
    // ==========================================

    window.API_BASE_URL = API_BASE_URL;
    window.ENDPOINTS = ENDPOINTS;

})();
