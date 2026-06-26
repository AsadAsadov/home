(function (window) {
  'use strict';

  function formatUnreadCount(count) {
    const value = Number(count) || 0;
    return value > 99 ? '99+' : String(Math.max(0, value));
  }

  function badgeSlotHtml(type, count) {
    const unread = Number(count) || 0;
    const classes = type === 'notification' ? 'notification-badge mobile-notification-badge' : 'message-badge';
    return `<span class="${classes}${unread > 0 ? '' : ' hidden'}" data-${type}-badge>${formatUnreadCount(unread)}</span>`;
  }

  function updateBadge(type, count, root = document) {
    root.querySelectorAll(`[data-${type}-badge]`).forEach((badge) => {
      const unread = Number(count) || 0;
      badge.textContent = formatUnreadCount(unread);
      badge.classList.toggle('hidden', unread <= 0);
    });
  }

  window.BestHomeNotifications = { formatUnreadCount, badgeSlotHtml, updateBadge };
})(window);
