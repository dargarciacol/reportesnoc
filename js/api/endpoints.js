
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

        AUTH: {
            LOGIN: `${API_BASE_URL}/auth/login`,
            LOGOUT: `${API_BASE_URL}/auth/logout`
        },

        DASHBOARD: {
            SUMMARY: `${API_BASE_URL}/dashboard/summary`
        },

        INGEST: {
            UPLOAD_EXCEL: `${API_BASE_URL}/ingest/excel`
        },

        EVENTS: {
            LIST: `${API_BASE_URL}/events`,
            DETAILS: (id) =>
                `${API_BASE_URL}/events/${validateId(id, 'Event ID')}`
        },

        ALERTS: {
            LIST: `${API_BASE_URL}/alerts`,
            UPDATE_STATUS: (id) =>
                `${API_BASE_URL}/alerts/${validateId(id, 'Alert ID')}/status`
        },

        INCIDENTS: {
            LIST: `${API_BASE_URL}/incidents`,
            CREATE: `${API_BASE_URL}/incidents`
        },

        DETECTION: {
            RULES: `${API_BASE_URL}/detection/rules`,
            CREATE_RULE: `${API_BASE_URL}/detection/rules`,
            TOGGLE_RULE: (id) =>
                `${API_BASE_URL}/detection/rules/${validateId(id, 'Rule ID')}/toggle`,
            REPROCESS: `${API_BASE_URL}/detection/rules/reprocess`
        },

        INVESTIGATIONS: {
            BY_INCIDENT: (incidentId) =>
                `${API_BASE_URL}/investigations/incident/${validateId(incidentId, 'Incident ID')}`,
            SUBMIT_VERDICT: (id) =>
                `${API_BASE_URL}/investigations/${validateId(id, 'Investigation ID')}/verdict`
        },

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
