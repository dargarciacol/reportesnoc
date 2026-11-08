
(function () {
    'use strict';

    // =========================================================
    // CONFIGURATION
    // =========================================================

    const TOKEN_KEY = 'nova_token';

    const DEFAULT_CREDENTIALS = 'include';

    // =========================================================
    // API ERROR
    // =========================================================

    class ApiError extends Error {
        constructor(message, status = null, data = null) {
            super(message);

            this.name = 'ApiError';
            this.status = status;
            this.data = data;
        }
    }

    // =========================================================
    // HTTP CLIENT
    // =========================================================

    const HttpClient = {

        request: async (url, options = {}) => {

            if (!url || typeof url !== 'string') {
                throw new ApiError(
                    'A valid API URL is required.'
                );
            }

            const headers = new Headers(options.headers || {});

            // -------------------------------------------------
            // AUTHENTICATION
            // -------------------------------------------------

            const token = sessionStorage.getItem(TOKEN_KEY);

            // Optional JWT support.
            // Cookie-based authentication is handled through
            // fetch credentials below.
            if (token) {
                headers.set(
                    'Authorization',
                    `Bearer ${token}`
                );
            }

            // -------------------------------------------------
            // REQUEST BODY
            // -------------------------------------------------

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

            const isArrayBuffer =
                typeof ArrayBuffer !== 'undefined' &&
                body instanceof ArrayBuffer;

            const isTypedArray =
                typeof ArrayBuffer !== 'undefined' &&
                ArrayBuffer.isView(body);

            const isJsonObject =
                body !== null &&
                typeof body === 'object' &&
                !isFormData &&
                !isBlob &&
                !isSearchParams &&
                !isArrayBuffer &&
                !isTypedArray;

            if (isJsonObject) {
                headers.set(
                    'Content-Type',
                    'application/json'
                );

                body = JSON.stringify(body);
            }

            // The browser must generate the multipart boundary.
            if (isFormData) {
                headers.delete('Content-Type');
            }

            if (!headers.has('Accept')) {
                headers.set('Accept', 'application/json');
            }

            // -------------------------------------------------
            // FETCH OPTIONS
            // -------------------------------------------------

            const requestOptions = {
                ...options,

                method: (options.method || 'GET').toUpperCase(),

                headers,

                credentials:
                    options.credentials ?? DEFAULT_CREDENTIALS,

                body
            };

            // -------------------------------------------------
            // REQUEST
            // -------------------------------------------------

            try {

                const response = await fetch(
                    url,
                    requestOptions
                );

                // -------------------------------------------------
                // EMPTY RESPONSE
                // -------------------------------------------------

                if (response.status === 204) {
                    return null;
                }

                // -------------------------------------------------
                // RESPONSE PARSING
                // -------------------------------------------------

                const responseText = await response.text();

                let responseData = null;

                if (responseText) {
                    try {
                        responseData = JSON.parse(responseText);
                    } catch {
                        responseData = responseText;
                    }
                }

                // -------------------------------------------------
                // HTTP ERRORS
                // -------------------------------------------------

                if (!response.ok) {

                    let message =
                        responseData?.message ||
                        responseData?.error ||
                        responseData?.detail ||
                        `HTTP Error: ${response.status}`;

                    switch (response.status) {

                        case 401:
                            message =
                                'Unauthorized. Please authenticate again.';
                            break;

                        case 403:
                            message =
                                'Access denied. Insufficient permissions.';
                            break;

                        case 404:
                            message =
                                responseData?.message ||
                                'Requested resource not found.';
                            break;

                        default:
                            if (response.status >= 500) {
                                message =
                                    responseData?.message ||
                                    'Server error. Please try again later.';
                            }
                    }

                    throw new ApiError(
                        message,
                        response.status,
                        responseData
                    );
                }

                return responseData;

            } catch (error) {

                // Preserve API errors and their HTTP status.
                if (error instanceof ApiError) {

                    console.error('API Request Failed:', {
                        url,
                        method: requestOptions.method,
                        status: error.status,
                        message: error.message,
                        data: error.data
                    });

                    throw error;
                }

                // Network, CORS, DNS and fetch errors.
                const networkError = new ApiError(
                    'Unable to connect to the server. Check your connection and try again.',
                    null,
                    error?.message || null
                );

                console.error('API Network Error:', {
                    url,
                    method: requestOptions.method,
                    message: error?.message
                });

                throw networkError;
            }
        },

        // =====================================================
        // GET
        // =====================================================

        get: (url, options = {}) =>
            HttpClient.request(url, {
                ...options,
                method: 'GET'
            }),

        // =====================================================
        // POST
        // =====================================================

        post: (url, body, options = {}) =>
            HttpClient.request(url, {
                ...options,
                method: 'POST',
                body
            }),

        // =====================================================
        // PUT
        // =====================================================

        put: (url, body, options = {}) =>
            HttpClient.request(url, {
                ...options,
                method: 'PUT',
                body
            }),

        // =====================================================
        // PATCH
        // =====================================================

        patch: (url, body, options = {}) =>
            HttpClient.request(url, {
                ...options,
                method: 'PATCH',
                body
            }),

        // =====================================================
        // DELETE
        // =====================================================

        delete: (url, options = {}) =>
            HttpClient.request(url, {
                ...options,
                method: 'DELETE'
            })
    };

    // =========================================================
    // GLOBAL EXPORTS
    // =========================================================

    window.HttpClient = HttpClient;
    window.ApiError = ApiError;

})();
