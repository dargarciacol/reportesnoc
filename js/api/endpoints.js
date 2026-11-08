const API_BASE_URL = 'http://localhost:8080/api/v1';

const ENDPOINTS = {
    AUTH: {
        LOGIN: `${API_BASE_URL}/auth/login`,
        LOGOUT: `${API_BASE_URL}/auth/logout`,
        SESSION: `${API_BASE_URL}/auth/session`
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
        CREATE: `${API_BASE_URL}/incidents`,
        DETAILS: (id) => `${API_BASE_URL}/incidents/${id}`
    }
};