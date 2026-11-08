
const API_BASE_URL = 'https://backend-siem.onrender.com/api/v1';

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
        DETAILS: (id) => `${API_BASE_URL}/events/${id}`
    },

    ALERTS: {
        LIST: `${API_BASE_URL}/alerts`,
        UPDATE_STATUS: (id) => `${API_BASE_URL}/alerts/${id}/status`
    },

    INCIDENTS: {
        LIST: `${API_BASE_URL}/incidents`,
        CREATE: `${API_BASE_URL}/incidents`
    },

    DETECTION: {
        RULES: `${API_BASE_URL}/detection/rules`,
        TOGGLE_RULE: (id) => `${API_BASE_URL}/detection/rules/${id}/toggle`
    },

    INVESTIGATIONS: {
        BY_INCIDENT: (incidentId) =>
            `${API_BASE_URL}/investigations/incident/${incidentId}`,
        SUBMIT_VERDICT: (id) =>
            `${API_BASE_URL}/investigations/${id}/verdict`
    },

    REPORTS: {
        GENERATE: `${API_BASE_URL}/reports/generate`
    }
};
