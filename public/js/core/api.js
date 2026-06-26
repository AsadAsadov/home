(function (window) {
    'use strict';
    function resolveApiUrl(url) {
        return String(url || '').startsWith('http') ? url : `${window.API_BASE || window.location.origin}${url}`;
    }
    async function parseErrorBody(response) {
        return response.json().catch(() => ({}));
    }
    async function apiRequest(url, method = 'GET', body = null) {
        let options = {};
        if (typeof method === 'object') {
            options = { ...method };
            method = options.method || 'GET';
            body = options.body ?? null;
        }
        const authRedirect = options.authRedirect !== false;
        delete options.authRedirect;
        const headers = { ...(options.headers || {}) };
        const isFormData = body instanceof FormData;
        if (body && !isFormData && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
        const token = typeof window.getAuthToken === 'function' ? window.getAuthToken() : '';
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(resolveApiUrl(url), { ...options, method, body, headers });
        if (token && response.ok && typeof window.refreshAuthLastActiveAt === 'function') window.refreshAuthLastActiveAt();
        if (response.status === 401) {
            const errorBody = await parseErrorBody(response);
            if (authRedirect && token && typeof window.redirectToLoginOnAuthFailure === 'function') window.redirectToLoginOnAuthFailure();
            const error = new Error(errorBody.message || 'Sessiya bitib. Zəhmət olmasa yenidən daxil olun.');
            error.status = 401;
            throw error;
        }
        if (!response.ok) {
            const errorBody = await parseErrorBody(response);
            const error = new Error(errorBody.message || 'API sorğusu uğursuz oldu');
            error.status = response.status;
            throw error;
        }
        return response.status === 204 ? null : response.json();
    }
    Object.assign(window, { apiRequest, resolveApiUrl, parseErrorBody });
    window.BestHomeAPI = { apiRequest, resolveApiUrl, parseErrorBody };
})(window);
