(function (window) {
    'use strict';
    const listeners = new Map();
    function getAppState(key) { return key ? window.appData?.[key] : window.appData; }
    function setAppState(key, value) { if (!window.appData || !key) return value; window.appData[key] = value; dispatchAppStateChange(key, value); return value; }
    function dispatchAppStateChange(key, value) {
        const event = new CustomEvent('besthome:state-change', { detail: { key, value } });
        window.dispatchEvent(event);
        (listeners.get(key) || []).forEach(listener => listener(value, key));
    }
    function subscribeAppState(key, listener) {
        if (!listeners.has(key)) listeners.set(key, new Set());
        listeners.get(key).add(listener);
        return () => listeners.get(key)?.delete(listener);
    }
    Object.assign(window, { getAppState, setAppState, dispatchAppStateChange, subscribeAppState });
    window.BestHomeState = { getAppState, setAppState, dispatchAppStateChange, subscribeAppState };
})(window);
