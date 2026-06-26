(function (window) {
  'use strict';

  const deps = {
    state: { notificationsUnread: 0, messagesUnread: 0, notifications: [], notificationsLoadedAt: 0, notificationsReadAllInFlight: null },
    isMessageNotification: () => false,
    writeCache: () => {},
    apiRequest: (...args) => window.apiRequest(...args),
    escapeHtml: (value) => String(value ?? ''),
    formatAzDateTime: (value) => String(value ?? ''),
    spaNavigate: (path) => { window.location.href = path; },
    showToast: (message) => console.warn(message),
    perfLog: (label, startedAt) => console.log(`[perf] ${label} ${Math.round(performance.now() - startedAt)}ms`)
  };

  function configure(options = {}) { Object.assign(deps, options); }
  function state() { return deps.state; }
  function isMessageNotification(item) { return deps.isMessageNotification(item); }
  function visibleNotifications() { return (state().notifications || []).filter(item => !isMessageNotification(item)); }
  function escapeHtml(value) { return deps.escapeHtml(value); }

  function formatUnreadCount(count) {
    const value = Number(count || 0);
    return value > 99 ? '99+' : String(Math.max(0, value));
  }

  function badgeHtml(count, extraClass = '') {
    const value = Number(count || 0);
    const classes = ['header-badge-btn__badge', extraClass, value ? '' : 'is-empty'].filter(Boolean).join(' ');
    return `<span class="${classes}">${formatUnreadCount(value)}</span>`;
  }

  function badgeSlotHtml(type, count, options = {}) {
    const attr = type === 'message' ? 'data-message-badge' : 'data-notification-badge';
    const variant = options.variant ? ` data-badge-variant="${escapeHtml(options.variant)}"` : '';
    return `<span ${attr} class="header-badge-btn__slot"${variant}>${badgeHtml(count, options.badgeClass || '')}</span>`;
  }

  function badgeClassForSlot(el, type) {
    return type === 'notification' && el?.dataset?.badgeVariant === 'mobile' ? 'mobile-notification-badge' : '';
  }

  function updateMobileNotificationAccess() { document.getElementById('mobile-bottom-notification-btn')?.remove(); }

  function updateHeaderBadges() {
    clearTimeout(state().badgeRefreshTimer);
    updateMobileNotificationAccess();
    document.querySelectorAll('[data-notification-badge]').forEach(el => { el.innerHTML = badgeHtml(state().notificationsUnread, badgeClassForSlot(el, 'notification')); });
    document.querySelectorAll('[data-message-badge]').forEach(el => { el.innerHTML = badgeHtml(state().messagesUnread, badgeClassForSlot(el, 'message')); });
  }

  function updateBadge(type = 'notification', count, root = document) {
    if (type === 'notification' && Number.isFinite(Number(count))) state().notificationsUnread = Math.max(0, Number(count));
    if (type === 'message' && Number.isFinite(Number(count))) state().messagesUnread = Math.max(0, Number(count));
    const selector = type === 'message' ? '[data-message-badge]' : '[data-notification-badge]';
    root.querySelectorAll(selector).forEach(el => { el.innerHTML = badgeHtml(type === 'message' ? state().messagesUnread : state().notificationsUnread, badgeClassForSlot(el, type)); });
  }

  function updateOpenNotificationsPanel() {
    const panel = document.getElementById('notification-panel');
    if (!panel) return;
    renderNotificationsPanel({ full: panel.classList.contains('notification-panel--full') });
  }

  function isNotificationsPanelOpen() { return Boolean(document.getElementById('notification-panel')); }

  function handleRealtimeNotification(eventName, payload = {}) {
    if (eventName === 'notification:new') return handleRealtimeNotificationNew(payload);
    if (eventName === 'notification:read') return handleRealtimeNotificationRead(payload);
    if (eventName === 'notification:read-all') return handleRealtimeNotificationsReadAll(payload);
  }

  function handleRealtimeNotificationNew(payload) {
    const notification = payload?.notification || payload;
    const unreadCount = Number(payload?.unreadCount);
    if (!notification || isMessageNotification(notification)) return;
    const panelOpen = isNotificationsPanelOpen();
    const localNotification = panelOpen ? { ...notification, isRead: true } : notification;
    const alreadyVisible = state().notifications.some(n => String(n.id) === String(notification.id));
    state().notifications = [localNotification, ...state().notifications.filter(n => String(n.id) !== String(notification.id))];
    if (panelOpen) {
      state().notificationsUnread = 0;
      deps.apiRequest(`/api/notifications/${notification.id}/read`, { method: 'PATCH' }).catch(error => console.warn('Notification auto-read failed', error));
    } else if (Number.isFinite(unreadCount)) state().notificationsUnread = Math.max(0, unreadCount);
    else if (!alreadyVisible && !notification.isRead) state().notificationsUnread += 1;
    updateHeaderBadges(); updateOpenNotificationsPanel(); deps.writeCache();
  }

  function handleRealtimeNotificationRead({ notificationId, unreadCount } = {}) {
    if (notificationId) {
      const item = state().notifications.find(n => String(n.id) === String(notificationId) && !isMessageNotification(n));
      if (item) item.isRead = true;
    }
    const nextCount = Number(unreadCount);
    if (Number.isFinite(nextCount)) state().notificationsUnread = Math.max(0, nextCount);
    updateHeaderBadges(); updateOpenNotificationsPanel(); deps.writeCache();
  }

  function handleRealtimeNotificationsReadAll({ unreadCount } = {}) {
    state().notifications = state().notifications.map(n => isMessageNotification(n) ? n : ({ ...n, isRead: true }));
    const nextCount = Number(unreadCount);
    state().notificationsUnread = Number.isFinite(nextCount) ? Math.max(0, nextCount) : 0;
    updateHeaderBadges(); updateOpenNotificationsPanel(); deps.writeCache();
  }

  function preloadNotifications() {
    if (Date.now() - (state().notificationsLoadedAt || 0) <= 15000) return;
    deps.apiRequest('/api/notifications?limit=30')
      .then(result => { state().notifications = (result.data || []).filter(item => !isMessageNotification(item)); state().notificationsLoadedAt = Date.now(); deps.writeCache(); })
      .catch(error => console.warn('Notification preload failed', error));
  }

  function closeNotificationsPanel() {
    document.getElementById('notification-panel')?.remove();
    document.getElementById('notification-full-backdrop')?.remove();
    document.removeEventListener('click', handleNotificationOutsideClick, true);
    document.removeEventListener('keydown', handleNotificationKeydown, true);
  }
  function handleNotificationOutsideClick(event) { if (event.target.closest('#notification-panel') || event.target.closest('[data-notification-toggle]')) return; closeNotificationsPanel(); }
  function handleNotificationKeydown(event) { if (event.key === 'Escape') closeNotificationsPanel(); }

  function positionNotificationPanel(panel) {
    if (!panel || panel.classList.contains('notification-panel--full')) return;
    const isMobile = window.innerWidth <= 768;
    const mobileBottomToggle = document.getElementById('mobile-bottom-notification-btn');
    const anchor = document.querySelector('[data-notification-toggle]:focus') || (isMobile && mobileBottomToggle && !mobileBottomToggle.classList.contains('is-hidden') ? mobileBottomToggle : null) || document.querySelector('[data-notification-toggle]');
    const rect = anchor?.getBoundingClientRect();
    const anchoredInBottomNav = Boolean(anchor?.closest?.('#mobile-bottom-nav'));
    const top = Math.max(70, (rect?.bottom || 78) + 8);
    panel.style.bottom = ''; panel.style.maxHeight = ''; panel.style.top = `${top}px`;
    if (isMobile) {
      panel.style.left = '10px'; panel.style.right = '10px';
      if (anchoredInBottomNav) { panel.style.top = 'auto'; panel.style.bottom = 'calc(var(--mobile-bottom-nav-height) + 12px + env(safe-area-inset-bottom))'; panel.style.maxHeight = 'calc(100dvh - var(--header-height) - var(--mobile-bottom-nav-height) - 24px)'; }
      return;
    }
    const width = Math.min(380, window.innerWidth - 28);
    panel.style.width = `${width}px`; panel.style.left = `${Math.max(14, Math.min(window.innerWidth - width - 14, (rect?.right || window.innerWidth - 18) - width))}px`; panel.style.right = 'auto';
  }

  function renderNotificationsPanel({ full = false, loading = false, error = '' } = {}) {
    const notifications = visibleNotifications();
    const body = loading ? '<div class="p-4 space-y-2"><div class="h-12 rounded-2xl bg-slate-100 animate-pulse"></div><div class="h-12 rounded-2xl bg-slate-100 animate-pulse"></div></div>' : (notifications.length ? notifications.map(renderNotificationItem).join('') : '<div class="p-6 text-center text-slate-500 font-bold">Bildiriş yoxdur</div>');
    const panel = document.getElementById('notification-panel');
    const html = `<div class="flex items-center justify-between gap-3 px-1 pb-2"><strong class="text-slate-950">🔔 Bildirişlər</strong><div class="flex items-center gap-3"><button onclick="openAllNotifications()" class="text-xs font-black text-brand-600">Hamısına bax</button><button onclick="markAllNotificationsRead()" class="text-xs font-black text-brand-600">Hamısını oxu</button>${full ? '<button onclick="closeNotificationsPanel()" class="text-slate-500 hover:text-slate-950 text-lg font-black leading-none" aria-label="Bağla">×</button>' : ''}</div></div><div>${body}</div>${error ? `<div class="notification-inline-error">${escapeHtml(error)}</div>` : ''}`;
    if (full && !document.getElementById('notification-full-backdrop')) document.body.insertAdjacentHTML('beforeend', '<div id="notification-full-backdrop" class="notification-full-backdrop" onclick="closeNotificationsPanel()"></div>');
    if (panel) { panel.className = `notification-panel ${full ? 'notification-panel--full' : ''}`; panel.innerHTML = html; positionNotificationPanel(panel); return; }
    document.body.insertAdjacentHTML('beforeend', `<div id="notification-panel" class="notification-panel ${full ? 'notification-panel--full' : ''}">${html}</div>`);
    positionNotificationPanel(document.getElementById('notification-panel'));
    setTimeout(() => { document.addEventListener('click', handleNotificationOutsideClick, true); document.addEventListener('keydown', handleNotificationKeydown, true); }, 0);
  }

  function markNotificationsReadLocal() { const previousUnread = state().notificationsUnread; const previousNotifications = state().notifications.map(n => ({ ...n })); state().notificationsUnread = 0; state().notifications = state().notifications.map(n => isMessageNotification(n) ? n : ({ ...n, isRead: true })); updateHeaderBadges(); deps.writeCache(); return { previousUnread, previousNotifications }; }
  function restoreNotificationsReadLocal(snapshot) { if (!snapshot) return; state().notificationsUnread = snapshot.previousUnread; state().notifications = snapshot.previousNotifications; updateHeaderBadges(); deps.writeCache(); }
  async function markNotificationsReadAllRequest() { const result = await deps.apiRequest('/api/notifications/read-all', { method: 'PATCH' }); const nextUnread = Number(result?.unreadCount); state().notificationsUnread = Number.isFinite(nextUnread) ? Math.max(0, nextUnread) : 0; state().notifications = state().notifications.map(n => isMessageNotification(n) ? n : ({ ...n, isRead: true })); updateHeaderBadges(); deps.writeCache(); return result; }
  async function markNotificationsReadOnPanelOpen() { if (state().notificationsUnread <= 0) return; if (state().notificationsReadAllInFlight) return state().notificationsReadAllInFlight; const snapshot = markNotificationsReadLocal(); updateOpenNotificationsPanel(); state().notificationsReadAllInFlight = markNotificationsReadAllRequest().catch(error => { restoreNotificationsReadLocal(snapshot); updateOpenNotificationsPanel(); console.warn('Notification panel auto-read failed', error); throw error; }).finally(() => { state().notificationsReadAllInFlight = null; }); return state().notificationsReadAllInFlight; }

  async function toggleNotificationsPanel() { const startedAt = performance.now(); const existing = document.getElementById('notification-panel'); if (existing && !existing.classList.contains('notification-panel--full')) { closeNotificationsPanel(); return; } renderNotificationsPanel({ loading: !visibleNotifications().length }); deps.perfLog('notifications_open_ms', startedAt); try { await markNotificationsReadOnPanelOpen(); } catch (_error) {} if (Date.now() - (state().notificationsLoadedAt || 0) < 15000) return; try { const result = await deps.apiRequest('/api/notifications'); state().notifications = (result.data || []).filter(item => !isMessageNotification(item)); state().notificationsLoadedAt = Date.now(); deps.writeCache(); renderNotificationsPanel(); } catch (error) { renderNotificationsPanel({ error: error.message || 'Bildirişlər yüklənmədi.' }); } }
  async function openAllNotifications() { closeNotificationsPanel(); renderNotificationsPanel({ full: true, loading: !visibleNotifications().length }); try { await markNotificationsReadOnPanelOpen(); } catch (_error) {} try { const result = await deps.apiRequest('/api/notifications?all=true&limit=1000'); state().notifications = (result.data || []).filter(item => !isMessageNotification(item)); state().notificationsLoadedAt = Date.now(); deps.writeCache(); renderNotificationsPanel({ full: true }); } catch (error) { renderNotificationsPanel({ full: true, error: error.message || 'Bildirişlər yüklənmədi.' }); } }

  function safeNotificationArg(value) { return encodeURIComponent(String(value || '')); }
  function decodeNotificationArg(value) { try { return decodeURIComponent(String(value || '')); } catch (_error) { return String(value || ''); } }
  function getVideoProvider(url) { try { const parsed = new URL(url); const host = parsed.hostname.toLowerCase(); if (host.includes('youtu.be') || host.includes('youtube.com')) return 'youtube'; if (host.includes('vimeo.com')) return 'vimeo'; if (parsed.pathname.toLowerCase().endsWith('.mp4')) return 'mp4'; } catch (_error) {} return ''; }
  function youtubeVideoId(url) { try { const parsed = new URL(url); if (parsed.hostname.toLowerCase().includes('youtu.be')) return parsed.pathname.split('/').filter(Boolean)[0] || ''; if (parsed.searchParams.get('v')) return parsed.searchParams.get('v'); const parts = parsed.pathname.split('/').filter(Boolean); const marker = parts.findIndex(part => ['embed', 'shorts'].includes(part)); return marker > -1 ? (parts[marker + 1] || '') : ''; } catch (_error) { return ''; } }
  function notificationVideoThumb(item) { if (item.imageUrl) return item.imageUrl; if (getVideoProvider(item.videoUrl) === 'youtube') { const id = youtubeVideoId(item.videoUrl); if (id) return `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`; } return ''; }
  function renderNotificationMedia(item) { if (item.videoUrl) { const thumb = notificationVideoThumb(item); const media = thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(item.title || 'Video')}" loading="lazy">` : '<div class="notification-video-frame flex items-center justify-center text-white font-black text-sm">Video</div>'; return `<div class="notification-media" onclick="event.stopPropagation(); openNotificationVideo('${safeNotificationArg(item.id)}')">${media}<div class="notification-media__play"><i class="fa-solid fa-circle-play"></i></div></div>`; } if (item.imageUrl) return `<div class="notification-media"><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title || 'Bildiriş')}" loading="lazy"></div>`; return ''; }
  function renderNotificationActions(item) { const actions = []; if (item.link) actions.push(`<button type="button" class="notification-detail-link" onclick="event.stopPropagation(); openNotification('${safeNotificationArg(item.id)}', '${safeNotificationArg(item.link || '')}', 'link')">Ətraflı bax</button>`); if (item.videoUrl) actions.push(`<button type="button" class="notification-video-link" onclick="event.stopPropagation(); openNotification('${safeNotificationArg(item.id)}', '', 'video')">Videoya bax</button>`); if (!actions.length) actions.push('<span></span>'); actions.push(`<div class="notification-action-row__date text-[10px] font-bold text-slate-400">${deps.formatAzDateTime(item.createdAt)}</div>`); return actions.join(''); }
  function renderNotificationItem(item) { const defaultAction = item.link ? 'link' : (item.videoUrl ? 'video' : 'link'); return `<div role="button" tabindex="0" class="notification-item ${item.isRead ? '' : 'is-unread'}" onclick="openNotification('${safeNotificationArg(item.id)}', '${safeNotificationArg(item.link || '')}', '${defaultAction}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}">${renderNotificationMedia(item)}<div class="font-black">${escapeHtml(item.title)}</div><div class="text-xs font-bold text-slate-600 mt-1">${escapeHtml(item.message || '')}</div><div class="notification-action-row">${renderNotificationActions(item)}</div></div>`; }
  function closeNotificationVideo() { document.getElementById('notification-video-modal')?.remove(); }
  function markNotificationVideoRead(id) { markNotificationReadLocal(id); deps.apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => deps.showToast('Bildiriş oxundu kimi işarələnmədi.')); }
  function openNotificationExternalVideo(item, id) { markNotificationVideoRead(id); window.open(item.videoUrl, '_blank', 'noopener,noreferrer'); }
  function openNotificationVideo(id) { id = decodeNotificationArg(id); const item = state().notifications.find(n => String(n.id) === String(id) && !isMessageNotification(n)); if (!item?.videoUrl) return; const provider = getVideoProvider(item.videoUrl); if (provider === 'youtube' || provider === 'vimeo' || provider !== 'mp4') { openNotificationExternalVideo(item, id); return; } markNotificationVideoRead(id); const player = `<video src="${escapeHtml(item.videoUrl)}" controls autoplay playsinline></video>`; closeNotificationVideo(); document.body.insertAdjacentHTML('beforeend', `<div id="notification-video-modal" class="notification-video-modal" onclick="if(event.target.id==='notification-video-modal') closeNotificationVideo()"><div class="notification-video-modal__card"><div class="notification-video-modal__head"><strong>${escapeHtml(item.title || 'Video')}</strong><button class="notification-video-modal__close" onclick="closeNotificationVideo()" aria-label="Bağla">×</button></div><div class="notification-video-modal__body">${player}</div></div></div>`); }
  function markNotificationReadLocal(id) { id = decodeNotificationArg(id); const item = state().notifications.find(n => String(n.id) === String(id) && !isMessageNotification(n)); const wasUnread = item && !item.isRead; if (item) item.isRead = true; if (wasUnread) state().notificationsUnread = Math.max(0, state().notificationsUnread - 1); updateHeaderBadges(); deps.writeCache(); return { item, wasUnread }; }
  function openNotification(id, link, action = 'link') { id = decodeNotificationArg(id); link = decodeNotificationArg(link); const { item, wasUnread } = markNotificationReadLocal(id); closeNotificationsPanel(); if (action === 'video' && item?.videoUrl) { openNotificationVideo(id); return; } if (link) openNotificationLink(link); deps.apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => { if (item) item.isRead = false; if (wasUnread) state().notificationsUnread += 1; updateHeaderBadges(); deps.showToast('Bildiriş oxundu kimi işarələnmədi.'); }); }
  function openNotificationLink(link) { link = decodeNotificationArg(link); if (/^https?:\/\//i.test(link)) { window.open(link, '_blank', 'noopener,noreferrer'); return; } deps.spaNavigate(link.replace(window.location.origin, '')); }
  async function markAllNotificationsRead() { if (state().notificationsReadAllInFlight) { try { await state().notificationsReadAllInFlight; } catch (_error) {} return; } const snapshot = markNotificationsReadLocal(); const full = document.getElementById('notification-panel')?.classList.contains('notification-panel--full'); renderNotificationsPanel({ full }); state().notificationsReadAllInFlight = markNotificationsReadAllRequest().catch(error => { restoreNotificationsReadLocal(snapshot); renderNotificationsPanel({ full, error: error.message || 'Hamısını oxu alınmadı.' }); }).finally(() => { state().notificationsReadAllInFlight = null; }); await state().notificationsReadAllInFlight; }

  const api = { configure, formatUnreadCount, badgeSlotHtml, updateBadge, updateHeaderBadges, updateMobileNotificationAccess, preloadNotifications, handleRealtimeNotification, closeNotificationsPanel, toggleNotificationsPanel, openAllNotifications, openNotification, openNotificationVideo, closeNotificationVideo, markAllNotificationsRead };
  window.BestHomeNotifications = api;
  window.badgeSlotHtml = badgeSlotHtml;
  window.updateNotificationBadge = (count, root) => updateBadge('notification', count, root);
  window.updateBadge = updateBadge;
  window.toggleNotificationsPanel = toggleNotificationsPanel;
  window.closeNotificationsPanel = closeNotificationsPanel;
  window.openAllNotifications = openAllNotifications;
  window.openNotification = openNotification;
  window.openNotificationVideo = openNotificationVideo;
  window.closeNotificationVideo = closeNotificationVideo;
  window.markAllNotificationsRead = markAllNotificationsRead;
})(window);
