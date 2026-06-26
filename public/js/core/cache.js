(function (window) {
    'use strict';
    const memoryCache = new Map();
    const pendingPromises = new Map();
    const CACHE_TTL_MS = 5 * 60 * 1000;
    function readCache(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && Object.prototype.hasOwnProperty.call(parsed, 'value') && Object.prototype.hasOwnProperty.call(parsed, 'expiresAt')) {
                return parsed.expiresAt > Date.now() ? parsed.value : fallback;
            }
            return parsed;
        } catch (_error) { return fallback; }
    }
    function cacheData(name, value, ttl = CACHE_TTL_MS) {
        if (window.appData) window.appData[name] = value;
        memoryCache.set(name, { value, expiresAt: Date.now() + ttl });
        try { const key = window.CACHE_KEYS?.[name]; if (key) localStorage.setItem(key, JSON.stringify({ value, expiresAt: Date.now() + ttl })); } catch (_error) {}
    }
    function getCachedData(name) {
        const cached = memoryCache.get(name);
        if (cached && cached.expiresAt > Date.now()) return cached.value;
        const key = window.CACHE_KEYS?.[name];
        if (!key) return window.appData?.[name];
        const stored = readCache(key, undefined);
        if (stored !== undefined) { if (window.appData) window.appData[name] = stored; return stored; }
        return window.appData?.[name];
    }
    function invalidateCache(name) {
        memoryCache.delete(name);
        pendingPromises.forEach((_value, key) => { if (key.startsWith(`${name}:`)) pendingPromises.delete(key); });
        try { const key = window.CACHE_KEYS?.[name]; if (key) localStorage.removeItem(key); } catch (_error) {}
    }
    Object.assign(window, { readCache, cacheData, getCachedData, invalidateCache, CACHE_TTL_MS, memoryCache, pendingPromises });
    window.BestHomeCache = { readCache, cacheData, getCachedData, invalidateCache, CACHE_TTL_MS, memoryCache, pendingPromises };
})(window);
