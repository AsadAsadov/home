(function (window) {
    'use strict';

    function escapeHtml(value = '') {
        return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
    }

    function formatPrice(price, currency = 'AZN') {
        const parsed = Number(price);
        if (!Number.isFinite(parsed)) return '—';
        const code = String(currency || 'AZN').toUpperCase() === 'USD' ? 'USD' : 'AZN';
        return `${parsed.toLocaleString('az-AZ')} ${code === 'USD' ? '$' : '₼'}`;
    }

    const AZ_MONTH_NAMES = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

    function formatAzDate(value) {
        if (typeof value === 'string') {
            const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (dateOnly) {
                const [, year, month, day] = dateOnly;
                return `${day} ${AZ_MONTH_NAMES[Number(month) - 1] || ''} ${year}`;
            }
        }
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return '—';
        const day = String(date.getDate()).padStart(2, '0');
        const month = AZ_MONTH_NAMES[date.getMonth()] || '';
        return `${day} ${month} ${date.getFullYear()}`;
    }

    function formatAzDateTime(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return '—';
        const day = String(date.getDate()).padStart(2, '0');
        const month = AZ_MONTH_NAMES[date.getMonth()] || '';
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${date.getFullYear()} • ${hours}:${minutes}`;
    }

    function formatCurrency(value) {
        return `${Math.max(0, Number(value) || 0).toLocaleString('az-AZ', { maximumFractionDigits: 2 })} AZN`;
    }

    function debounce(fn, wait = 250) {
        let timer = null;
        return function debounced(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    function throttle(fn, wait = 250) {
        let lastRun = 0;
        let timer = null;
        return function throttled(...args) {
            const now = Date.now();
            const remaining = wait - (now - lastRun);
            if (remaining <= 0) {
                clearTimeout(timer);
                timer = null;
                lastRun = now;
                fn.apply(this, args);
                return;
            }
            if (!timer) {
                timer = setTimeout(() => {
                    lastRun = Date.now();
                    timer = null;
                    fn.apply(this, args);
                }, remaining);
            }
        };
    }

    function deepClone(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function groupBy(items = [], keyGetter = item => item) {
        return (Array.isArray(items) ? items : []).reduce((groups, item) => {
            const key = typeof keyGetter === 'function' ? keyGetter(item) : item?.[keyGetter];
            (groups[key] ||= []).push(item);
            return groups;
        }, {});
    }

    Object.assign(window, { escapeHtml, formatPrice, formatAzDate, formatAzDateTime, formatCurrency, debounce, throttle, deepClone, groupBy });
    window.BestHomeUtils = { escapeHtml, formatPrice, formatAzDate, formatAzDateTime, formatCurrency, debounce, throttle, deepClone, groupBy };
})(window);
