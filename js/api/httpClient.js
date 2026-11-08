const HttpClient = {
    
    getCsrfToken: () => {
        const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
        return match ? match[2] : null;
    },

    request: async (url, options = {}) => {
        const headers = new Headers(options.headers || {});
        
        const csrfToken = HttpClient.getCsrfToken();
        if (csrfToken && options.method && options.method !== 'GET') {
            headers.append('X-XSRF-TOKEN', csrfToken);
        }

        if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
            headers.append('Content-Type', 'application/json');
            options.body = JSON.stringify(options.body);
        }

        options.credentials = 'include';
        options.headers = headers;

        try {
            const response = await fetch(url, options);
            
            if (response.status === 401 || response.status === 403) {
                window.location.href = 'index.html';
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    },

    get: (url, options) => HttpClient.request(url, { ...options, method: 'GET' }),
    post: (url, body, options) => HttpClient.request(url, { ...options, method: 'POST', body }),
    put: (url, body, options) => HttpClient.request(url, { ...options, method: 'PUT', body }),
    delete: (url, options) => HttpClient.request(url, { ...options, method: 'DELETE' })
};