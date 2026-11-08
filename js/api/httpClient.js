
(function () {
    'use strict';

    // ==========================================
    // CONFIGURACIÓN
    // ==========================================

    const TOKEN_KEY = 'nova_token';

    // ==========================================
    // CLASE DE ERRORES API
    // ==========================================

    class ApiError extends Error {
        constructor(message, status = null, data = null) {
            super(message);

            this.name = 'ApiError';
            this.status = status;
            this.data = data;
        }
    }

    // ==========================================
    // HTTP CLIENT
    // ==========================================

    const HttpClient = {

        // ======================================
        // REQUEST PRINCIPAL
        // ======================================

        request: async (url, options = {}) => {

            if (!url || typeof url !== 'string') {
                throw new Error('A valid API URL is required.');
            }

            const headers = new Headers(options.headers || {});

            const token = sessionStorage.getItem(TOKEN_KEY);

            if (token) {
                headers.set(
                    'Authorization',
                    `Bearer ${token}`
                );
            }

            let body = options.body;

            const isFormData =
                typeof FormData !== 'undefined' &&
                body instanceof FormData;

            const isBlob =
                typeof Blob !== 'undefined' &&
                body instanceof Blob;

            const isSearchParams =
                typeof URLSearchParams !== 'undefined' &&
                body instanceof URLSearchParams;

            // Serializar únicamente objetos JSON.
            if (
                body !== undefined &&
                body !== null &&
                typeof body === 'object' &&
                !isFormData &&
                !isBlob &&
                !isSearchParams &&
                !(body instanceof ArrayBuffer)
            ) {
                headers.set(
                    'Content-Type',
                    'application/json'
                );

                body = JSON.stringify(body);
            }

            // El navegador debe generar el boundary de multipart.
            if (isFormData) {
                headers.delete('Content-Type');
            }

            const requestOptions = {
                ...options,
                method: (options.method || 'GET').toUpperCase(),
                headers,
                body
            };

            try {

                const response = await fetch(
                    url,
                    requestOptions
                );

                // ==================================
                // PROCESAR RESPUESTA
                // ==================================

                const responseText = await response.text();

                let responseData = null;

                if (responseText) {
                    try {
                        responseData = JSON.parse(responseText);
                    } catch {
                        responseData = responseText;
                    }
                }

                // ==================================
                // ERRORES HTTP
                // ==================================

                if (!response.ok) {

                    let message =
                        responseData?.message ||
                        responseData?.error ||
                        responseData?.detail ||
                        `HTTP Error: ${response.status}`;

                    if (response.status === 400) {
                        message = message || 'Invalid request.';
                    }

                    if (response.status === 401) {
                        message =
                            'Unauthorized. Please authenticate again.';

                        console.error(
                            'NOVA SIEM: Authentication expired or invalid.'
                        );
                    }

                    if (response.status === 403) {
                        message =
                            'Access denied. Insufficient permissions.';
                    }

                    if (response.status === 404) {
                        message =
                            responseData?.message ||
                            'Requested resource not found.';
                    }

                    if (response.status >= 500) {
                        message =
                            responseData?.message ||
                            'Server error. Please try again later.';
                    }

                    throw new ApiError(
                        message,
                        response.status,
                        responseData
                    );
                }

                // ==================================
                // RESPUESTA EXITOSA
                // ==================================

                return responseData;

            } catch (error) {

                console.error(
                    'API Request Failed:',
                    {
                        url,
                        method: requestOptions.method,
                        message: error.message,
                        status: error.status || null,
                        data: error.data || null
                    }
                );

                throw error;
            }
        },

        // ======================================
        // GET
        // ======================================

        get: (url, options = {}) =>
            HttpClient.request(url, {
                ...options,
                method: 'GET'
            }),

        // ======================================
        // POST
        // ======================================

        post: (url, body, options = {}) =>
            HttpClient.request(url, {
                ...options,
                method: 'POST',
                body
            }),

        // ======================================
        // PUT
        // ======================================

        put: (url, body, options = {}) =>
            HttpClient.request(url, {
                ...options,
                method: 'PUT',
                body
            }),

        // ======================================
        // PATCH
        // ======================================

        patch: (url, body, options = {}) =>
            HttpClient.request(url, {
                ...options,
                method: 'PATCH',
                body
            }),

        // ======================================
        // DELETE
        // ======================================

        delete: (url, options = {}) =>
            HttpClient.request(url, {
                ...options,
                method: 'DELETE'
            })
    };

    // ==========================================
    // EXPORTAR GLOBALMENTE
    // ==========================================

    window.HttpClient = HttpClient;
    window.ApiError = ApiError;

})();
