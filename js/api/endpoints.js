
(function () {
    'use strict';

    // ==========================================
    // CONFIGURACIÓN BASE
    // ==========================================

    // Por defecto apunta al backend desplegado en Render. Para desarrollo local
    // (o cambiar de entorno) basta con agregar en el <head> de index.html y app.html:
    //   <meta name="nova-api-base-url" content="http://localhost:8080/api/v1">
    const DEFAULT_API_BASE_URL = 'https://backend-siem.onrender.com/api/v1';

    const configuredBaseUrl = document
        .querySelector('meta[name="nova-api-base-url"]')
        ?.getAttribute('content')
        ?.trim()
        .replace(/\/+$/, '');

    const API_BASE_URL = configuredBaseUrl || DEFAULT_API_BASE_URL;

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

        // ------------------------------------------
        // AUTENTICACIÓN
        // ------------------------------------------

        AUTH: {
            LOGIN: `${API_BASE_URL}/auth/login`,
            LOGOUT: `${API_BASE_URL}/auth/logout`
        },

        // ------------------------------------------
        // DASHBOARD
        // ------------------------------------------

        DASHBOARD: {
            SUMMARY: `${API_BASE_URL}/dashboard/summary`
        },

        // ------------------------------------------
        // INGESTA DE INFORMACIÓN
        // ------------------------------------------

        INGEST: {
            UPLOAD_EXCEL: `${API_BASE_URL}/ingest/excel`
        },

        // ------------------------------------------
        // EVENTOS DE SEGURIDAD
        // ------------------------------------------

        EVENTS: {
            LIST: `${API_BASE_URL}/events`,

            DETAILS: (id) =>
                `${API_BASE_URL}/events/${validateId(id, 'Event ID')}`
        },

        // ------------------------------------------
        // ALERTAS DE SEGURIDAD
        // ------------------------------------------

        ALERTS: {
            LIST: `${API_BASE_URL}/alerts`,

            UPDATE_STATUS: (id) =>
                `${API_BASE_URL}/alerts/${validateId(id, 'Alert ID')}/status`
        },

        // ------------------------------------------
        // INCIDENTES
        // ------------------------------------------

        INCIDENTS: {
            LIST: `${API_BASE_URL}/incidents`,
            CREATE: `${API_BASE_URL}/incidents`
        },

        // ------------------------------------------
        // MOTOR DE DETECCIÓN
        // ------------------------------------------

        DETECTION: {

            RULES: `${API_BASE_URL}/detection/rules`,

            CREATE_RULE: `${API_BASE_URL}/detection/rules`,

            TOGGLE_RULE: (id) =>
                `${API_BASE_URL}/detection/rules/${validateId(id, 'Rule ID')}/toggle`,

            REPROCESS: `${API_BASE_URL}/detection/rules/reprocess`
        },

        // ------------------------------------------
        // INVESTIGACIONES
        // ------------------------------------------

        INVESTIGATIONS: {

            BY_INCIDENT: (incidentId) =>
                `${API_BASE_URL}/investigations/incident/${validateId(incidentId, 'Incident ID')}`,

            GRAPH: (id) =>
                `${API_BASE_URL}/investigations/${validateId(id, 'Investigation ID')}/graph`,

            TIMELINE: (id) =>
                `${API_BASE_URL}/investigations/${validateId(id, 'Investigation ID')}/timeline`,

            SUBMIT_VERDICT: (id) =>
                `${API_BASE_URL}/investigations/${validateId(id, 'Investigation ID')}/verdict`
        },

        // ------------------------------------------
        // REPORTES
        // ------------------------------------------

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
