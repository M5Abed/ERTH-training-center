/**
 * Global Fetch Interceptor — ERTH Training Center
 * Guarantees that ALL API requests across the entire application carry:
 * 1. credentials: 'include' (for cross-origin session cookies)
 * 2. X-User-Id & Authorization: Bearer <uuid> (for resilient proxy/header authentication)
 * 3. X-CSRF-Token (for state-changing POST/PUT/DELETE requests)
 */

if (typeof window !== 'undefined' && window.fetch) {
    const originalFetch = window.fetch;

    window.fetch = async function (resource, init = {}) {
        let url = '';
        if (typeof resource === 'string') {
            url = resource;
        } else if (resource instanceof URL) {
            url = resource.href;
        } else if (resource && typeof resource === 'object' && 'url' in resource) {
            url = resource.url;
        }

        // Only intercept requests to /api/ endpoints
        if (url && (url.startsWith('/api') || url.includes('/api/'))) {
            init = init ? { ...init } : {};
            init.credentials = init.credentials || 'include';

            let rawHeaders = init.headers;
            if (!rawHeaders && resource instanceof Request) {
                rawHeaders = resource.headers;
            }

            const headers = new Headers(rawHeaders || {});

            // 1. Attach CSRF token if cookie exists
            const match = document.cookie.match(/(?:^|;\s*)thinktank_csrf_token=([^;]*)/);
            if (match && !headers.has('X-CSRF-Token')) {
                headers.set('X-CSRF-Token', match[1]);
            }

            // 2. Attach User UUID identity headers for resilient proxy authentication
            try {
                const storedStr = sessionStorage.getItem('erth_session_cache') || sessionStorage.getItem('thinktank_session_cache');
                if (storedStr) {
                    const stored = JSON.parse(storedStr);
                    const uid = stored?.data?.user?.id || stored?.data?.user?.uuid;
                    if (uid) {
                        if (!headers.has('X-User-Id')) {
                            headers.set('X-User-Id', String(uid));
                        }
                        if (!headers.has('Authorization')) {
                            headers.set('Authorization', `Bearer ${uid}`);
                        }
                    }
                }
            } catch (_) {}

            init.headers = headers;
        }

        return originalFetch.call(this, resource, init);
    };
}
