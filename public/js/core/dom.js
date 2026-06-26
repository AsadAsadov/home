(function (window, document) {
    'use strict';
    const qs = (selector, root = document) => root?.querySelector(selector) || null;
    const qsa = (selector, root = document) => Array.from(root?.querySelectorAll(selector) || []);
    function createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([key, value]) => {
            if (key === 'className') el.className = value;
            else if (key === 'dataset') Object.assign(el.dataset, value || {});
            else if (key in el) el[key] = value;
            else el.setAttribute(key, value);
        });
        (Array.isArray(children) ? children : [children]).filter(child => child !== null && child !== undefined).forEach(child => el.append(child instanceof Node ? child : document.createTextNode(String(child))));
        return el;
    }
    const toggleClass = (el, className, force) => el?.classList.toggle(className, force);
    const show = el => el?.classList.remove('hidden');
    const hide = el => el?.classList.add('hidden');
    const enable = el => { if (el) el.disabled = false; };
    const disable = el => { if (el) el.disabled = true; };
    const scrollToElement = (el, options = { behavior: 'smooth', block: 'start' }) => el?.scrollIntoView(options);
    const safeFocus = el => { try { el?.focus?.({ preventScroll: true }); } catch (_error) { el?.focus?.(); } };
    const replaceChildren = (el, ...children) => el?.replaceChildren(...children);
    Object.assign(window, { qs, qsa, createElement, toggleClass, show, hide, enable, disable, scrollToElement, safeFocus, replaceChildren });
    window.BestHomeDOM = { qs, qsa, createElement, toggleClass, show, hide, enable, disable, scrollToElement, safeFocus, replaceChildren };
})(window, document);
