
(function () {
    'use strict';

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================

    const TOKEN_KEY = 'nova_token';

    const DEFAULT_CREDENTIALS = 'include';

    // =========================================================
    // ERROR PERSONALIZADO DE API
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
    // PROCESAMIENTO DE RESPUESTAS
    // =========================================================

    async function parseResponse(response) {

        if (response.status === 204 || response.status === 205) {
            return null;
        }

        const responseText = await response.text();

        if (!responseText || !responseText.trim()) {
            return null;
        }

        try {

            return JSON.parse(responseText);

        } catch {

            return responseText;

        }

    }

    // =========================================================
    // EXTRACCIÓN DE MENSAJES DE ERROR
    // =========================================================

    function getErrorMessage(data, status) {

        if (typeof data === 'string' && data.trim()) {
            return data;
        }

        const serverMessage =
            data?.message ||
            data?.error ||
            data?.detail;

        if (serverMessage) {
            return serverMessage;
        }

        switch (status) {

            case 400:
                return 'La solicitud enviada no es válida.';

            case 401:
                return 'La sesión no está autorizada. Inicia sesión nuevamente.';

            case 403:
                return 'No tienes permisos para realizar esta operación.';

            case 404:
                return 'No se encontró el recurso solicitado.';

            case 409:
                return 'La operación presenta un conflicto con los datos existentes.';

            case 422:
                return 'Los datos enviados no superan la validación del servidor.';

            case 429:
                return 'Se han realizado demasiadas solicitudes. Inténtalo más tarde.';

            default:

                if (status >= 500) {
                    return 'Error interno del servidor. Inténtalo más tarde.';
                }

                return `Error HTTP: ${status}`;

        }

    }

    // =========================================================
    // HTTP CLIENT
    // =========================================================

    const HttpClient = {

        // =====================================================
        // SOLICITUD PRINCIPAL
        // =====================================================

        request: async (url, options = {}) => {

            if (!url || typeof url !== 'string') {

                throw new ApiError(
                    'Se requiere una URL válida para realizar la solicitud.'
                );

            }

            const headers = new Headers(options.headers || {});

            // -------------------------------------------------
            // AUTENTICACIÓN
            // -------------------------------------------------

            const token = sessionStorage.getItem(TOKEN_KEY);

            // Compatibilidad con autenticación JWT.
            // La autenticación mediante cookies se gestiona
            // utilizando la propiedad credentials de fetch.

            if (token) {

                headers.set(
                    'Authorization',
                    `Bearer ${token}`
                );

            }

            // -------------------------------------------------
            // PROCESAMIENTO DEL BODY
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

            // Los objetos y arreglos se convierten a JSON.

            if (isJsonObject) {

                headers.set(
                    'Content-Type',
                    'application/json'
                );

                body = JSON.stringify(body);

            }

            // El navegador administra automáticamente
            // el límite multipart de FormData.

            if (isFormData) {
                headers.delete('Content-Type');
            }

            // Tipo de respuesta esperado.

            if (!headers.has('Accept')) {

                headers.set(
                    'Accept',
                    'application/json'
                );

            }

            // -------------------------------------------------
            // OPCIONES DE FETCH
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
            // EJECUCIÓN DE LA SOLICITUD
            // -------------------------------------------------

            try {

                const response = await fetch(
                    url,
                    requestOptions
                );

                // -------------------------------------------------
                // PROCESAMIENTO DE RESPUESTA
                // -------------------------------------------------

                const responseData = await parseResponse(response);

                // -------------------------------------------------
                // VALIDACIÓN HTTP
                // -------------------------------------------------

                if (!response.ok) {

                    // Sesión expirada o token inválido: limpiar y volver al login.
                    // (No aplica al propio login, donde un 401 significa
                    // credenciales incorrectas.)
                    if (
                        response.status === 401 &&
                        !url.includes('/auth/login') &&
                        sessionStorage.getItem(TOKEN_KEY)
                    ) {
                        sessionStorage.removeItem(TOKEN_KEY);
                        sessionStorage.removeItem('nova_user');
                        sessionStorage.removeItem('nova_selected_incident_id');

                        if (
                            !window.location.pathname.endsWith('/index.html') &&
                            !window.location.pathname.endsWith('/')
                        ) {
                            window.location.replace('index.html');
                        }
                    }

                    const message = getErrorMessage(
                        responseData,
                        response.status
                    );

                    throw new ApiError(
                        message,
                        response.status,
                        responseData
                    );

                }

                return responseData;

            } catch (error) {

                // -------------------------------------------------
                // ERRORES HTTP DE LA API
                // -------------------------------------------------

                if (error instanceof ApiError) {

                    console.error('NOVA SIEM - Error de API:', {

                        url,

                        method: requestOptions.method,

                        status: error.status,

                        message: error.message,

                        data: error.data

                    });

                    throw error;

                }

                // -------------------------------------------------
                // SOLICITUD CANCELADA
                // -------------------------------------------------

                if (error?.name === 'AbortError') {

                    const abortError = new ApiError(
                        'La solicitud fue cancelada.',
                        null,
                        null
                    );

                    abortError.name = 'AbortError';

                    throw abortError;

                }

                // -------------------------------------------------
                // ERRORES DE RED
                // -------------------------------------------------

                const networkError = new ApiError(
                    'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.',
                    null,
                    error?.message || null
                );

                console.error('NOVA SIEM - Error de conexión:', {

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
    // EXPORTACIONES GLOBALES
    // =========================================================

    window.HttpClient = HttpClient;

    window.ApiError = ApiError;

})();
