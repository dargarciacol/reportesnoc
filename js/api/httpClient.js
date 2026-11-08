
const HttpClient = {

    request: async (url, options = {}) => {

        const headers = new Headers(options.headers || {});

        const token = sessionStorage.getItem('nova_token');

        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        let body = options.body;

        if (
            body &&
            typeof body === 'object' &&
            !(body instanceof FormData)
        ) {
            headers.set('Content-Type', 'application/json');
            body = JSON.stringify(body);
        }

        if (body instanceof FormData) {
            headers.delete('Content-Type');
        }

        try {

            const response = await fetch(url, {
                ...options,
                headers,
                body
            });

            const responseText = await response.text();

            let responseData = null;

            if (responseText) {
                try {
                    responseData = JSON.parse(responseText);
                } catch {
                    responseData = responseText;
                }
            }

            if (!response.ok) {

                const message =
                    responseData?.message ||
                    responseData?.error ||
                    `HTTP Error: ${response.status}`;

                const error = new Error(message);

                error.status = response.status;
                error.data = responseData;

                if (response.status === 401) {
                    error.message = 'Unauthorized. Please authenticate again.';
                }

                throw error;
            }

            return responseData;

        } catch (error) {

            console.error('API Request Failed:', {
                url,
                message: error.message,
                status: error.status || null
            });

            throw error;
        }
    },

    get: (url, options = {}) =>
        HttpClient.request(url, {
            ...options,
            method: 'GET'
        }),

    post: (url, body, options = {}) =>
        HttpClient.request(url, {
            ...options,
            method: 'POST',
            body
        }),

    put: (url, body, options = {}) =>
        HttpClient.request(url, {
            ...options,
            method: 'PUT',
            body
        }),

    patch: (url, body, options = {}) =>
        HttpClient.request(url, {
            ...options,
            method: 'PATCH',
            body
        }),

    delete: (url, options = {}) =>
        HttpClient.request(url, {
            ...options,
            method: 'DELETE'
        })
};

window.HttpClient = HttpClient;
