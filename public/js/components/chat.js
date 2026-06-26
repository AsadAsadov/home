        var messagingState = { notificationsUnread: 0, messagesUnread: 0, notifications: [], notificationsLoadedAt: 0, conversations: [], conversationsLoadedAt: 0, conversationsLoading: false, conversationsRequest: null, activeConversationId: null, activeConversation: null, activeMessages: [], messagesByConversation: new Map(), conversationRequests: new Map(), sendRequests: new Map(), socket: null, summaryLoadedAt: 0, pendingConversation: null, seenMessageIds: new Set(), badgeRefreshTimer: null, notificationsReadAllInFlight: null };

        function isMessageNotification(item) {
            return MESSAGE_NOTIFICATION_TYPES.has(String(item?.type || '').toLowerCase());
        }

        function visibleNotifications() {
            return (messagingState.notifications || []).filter(item => !isMessageNotification(item));
        }

        function readMessagingCache() {
            if (!activeUser) return;
            try {
                const cache = JSON.parse(localStorage.getItem(`besthome_messaging_cache_${activeUser.id}`) || '{}');
                if (Array.isArray(cache.notifications)) messagingState.notifications = cache.notifications.filter(item => !isMessageNotification(item));
                if (Array.isArray(cache.conversations)) messagingState.conversations = cache.conversations;
                if (cache.messagesByConversation && typeof cache.messagesByConversation === 'object') messagingState.messagesByConversation = new Map(Object.entries(cache.messagesByConversation));
                if (Number.isFinite(cache.notificationsUnread)) messagingState.notificationsUnread = cache.notificationsUnread;
                if (Number.isFinite(cache.messagesUnread)) messagingState.messagesUnread = cache.messagesUnread;
            } catch (_error) {}
        }

        function writeMessagingCache() {
            if (!activeUser) return;
            try {
                const messagesByConversation = Object.fromEntries(Array.from(messagingState.messagesByConversation.entries()).map(([id, rows]) => [id, (rows || []).slice(-30)]));
                localStorage.setItem(`besthome_messaging_cache_${activeUser.id}`, JSON.stringify({
                    notifications: visibleNotifications().slice(0, 100),
                    conversations: (messagingState.conversations || []).slice(0, 80),
                    messagesByConversation,
                    notificationsUnread: messagingState.notificationsUnread || 0,
                    messagesUnread: messagingState.messagesUnread || 0,
                    savedAt: Date.now()
                }));
            } catch (_error) {}
        }

        function badgeHtml(count, extraClass = '') {
            const value = Number(count || 0);
            const classes = ['header-badge-btn__badge', extraClass, value ? '' : 'is-empty'].filter(Boolean).join(' ');
            return `<span class="${classes}">${value > 99 ? '99+' : value}</span>`;
        }

        function badgeSlotHtml(type, count, options = {}) {
            const attr = type === 'message' ? 'data-message-badge' : 'data-notification-badge';
            const variant = options.variant ? ` data-badge-variant="${escapeHtml(options.variant)}"` : '';
            return `<span ${attr} class="header-badge-btn__slot"${variant}>${badgeHtml(count, options.badgeClass || '')}</span>`;
        }

        function badgeClassForSlot(el, type) {
            return type === 'notification' && el?.dataset?.badgeVariant === 'mobile' ? 'mobile-notification-badge' : '';
        }

        function updateMobileNotificationAccess() {
            document.getElementById('mobile-bottom-notification-btn')?.remove();
        }

        function refreshHeaderBadges() {
            clearTimeout(messagingState.badgeRefreshTimer);
            updateMobileNotificationAccess();
            document.querySelectorAll('[data-notification-badge]').forEach(el => {
                el.innerHTML = badgeHtml(messagingState.notificationsUnread, badgeClassForSlot(el, 'notification'));
            });
            document.querySelectorAll('[data-message-badge]').forEach(el => {
                el.innerHTML = badgeHtml(messagingState.messagesUnread, badgeClassForSlot(el, 'message'));
            });
        }

        function perfLog(label, startedAt) {
            console.log(`[perf] ${label} ${Math.round(performance.now() - startedAt)}ms`);
        }

        async function loadBadgeSummary() {
            if (!activeUser) return;
            if (Date.now() - (messagingState.summaryLoadedAt || 0) < 15000) return;
            messagingState.summaryLoadedAt = Date.now();
            try {
                const summary = await apiRequest('/api/notifications/summary');
                messagingState.notificationsUnread = summary.notificationsUnread || 0;
                messagingState.messagesUnread = summary.messagesUnread || 0;
                refreshHeaderBadges();
                writeMessagingCache();
            } catch (error) { console.warn('Badge summary failed', error); }
        }

        function ensureSocketClientScript() {
            return new Promise((resolve) => {
                if (window.io) return resolve(true);
                const script = document.createElement('script');
                script.src = '/socket.io/socket.io.js';
                script.onload = () => resolve(Boolean(window.io));
                script.onerror = () => resolve(false);
                document.head.appendChild(script);
            });
        }

        function updateOpenNotificationsPanel() {
            const panel = document.getElementById('notification-panel');
            if (!panel) return;
            renderNotificationsPanel({ full: panel.classList.contains('notification-panel--full') });
        }

        function isNotificationsPanelOpen() {
            return Boolean(document.getElementById('notification-panel'));
        }

        function handleRealtimeNotificationNew(payload) {
            const notification = payload?.notification || payload;
            const unreadCount = Number(payload?.unreadCount);
            if (!notification || isMessageNotification(notification)) return;
            const panelOpen = isNotificationsPanelOpen();
            const localNotification = panelOpen ? { ...notification, isRead: true } : notification;
            const alreadyVisible = messagingState.notifications.some(n => String(n.id) === String(notification.id));
            messagingState.notifications = [localNotification, ...messagingState.notifications.filter(n => String(n.id) !== String(notification.id))];
            if (panelOpen) {
                messagingState.notificationsUnread = 0;
                apiRequest(`/api/notifications/${notification.id}/read`, { method: 'PATCH' }).catch(error => console.warn('Notification auto-read failed', error));
            } else if (Number.isFinite(unreadCount)) {
                messagingState.notificationsUnread = Math.max(0, unreadCount);
            } else if (!alreadyVisible && !notification.isRead) {
                messagingState.notificationsUnread += 1;
            }
            refreshHeaderBadges();
            updateOpenNotificationsPanel();
            writeMessagingCache();
        }

        function handleRealtimeNotificationRead({ notificationId, unreadCount } = {}) {
            if (notificationId) {
                const item = messagingState.notifications.find(n => String(n.id) === String(notificationId) && !isMessageNotification(n));
                if (item) item.isRead = true;
            }
            const nextCount = Number(unreadCount);
            if (Number.isFinite(nextCount)) messagingState.notificationsUnread = Math.max(0, nextCount);
            refreshHeaderBadges();
            updateOpenNotificationsPanel();
            writeMessagingCache();
        }

        function handleRealtimeNotificationsReadAll({ unreadCount } = {}) {
            messagingState.notifications = messagingState.notifications.map(n => isMessageNotification(n) ? n : ({ ...n, isRead: true }));
            const nextCount = Number(unreadCount);
            messagingState.notificationsUnread = Number.isFinite(nextCount) ? Math.max(0, nextCount) : 0;
            refreshHeaderBadges();
            updateOpenNotificationsPanel();
            writeMessagingCache();
        }

        async function connectRealtime() {
            if (!activeUser || messagingState.socket) return;
            if (!await ensureSocketClientScript()) return;
            messagingState.socket = io({ auth: { token: getAuthToken() }, transports: ['websocket', 'polling'] });
            messagingState.socket.on('connect', () => loadBadgeSummary());
            messagingState.socket.on('notification:new', handleRealtimeNotificationNew);
            messagingState.socket.on('notification:read', handleRealtimeNotificationRead);
            messagingState.socket.on('notification:read-all', handleRealtimeNotificationsReadAll);
            messagingState.socket.on('message:new', ({ message }) => {
                if (!message || messagingState.seenMessageIds.has(String(message.id))) return;
                messagingState.seenMessageIds.add(String(message.id));
                if (String(message.senderId) === String(activeUser?.id)) return;
                const conv = messagingState.conversations.find(c => String(c.id) === String(message.conversationId));
                if (conv) { conv.lastMessage = message; conv.updatedAt = message.createdAt; }
                const cacheKey = String(message.conversationId);
                const cachedMessages = messagingState.messagesByConversation.get(cacheKey) || [];
                if (!cachedMessages.some(m => String(m.id) === String(message.id))) messagingState.messagesByConversation.set(cacheKey, [...cachedMessages, message].slice(-60));
                if (String(message.conversationId) === String(messagingState.activeConversationId)) { messagingState.activeMessages.push(message); renderChatWindow(messagingState.activeConversation, messagingState.activeMessages); }
                else { messagingState.messagesUnread += 1; if (conv) conv.unreadCount = (conv.unreadCount || 0) + 1; else loadConversations(true, { force: true }).catch(error => console.warn('Conversation revive failed', error)); refreshHeaderBadges(); renderConversations(); }
                writeMessagingCache();
            });
            messagingState.socket.on('message:deleted', ({ message }) => handleRealtimeMessageDeleted(message));
            messagingState.socket.on('conversation:hidden', ({ conversationId }) => handleRealtimeConversationHidden(conversationId));
            messagingState.socket.on('message:delivered', ({ messageId, deliveredAt }) => updateLocalMessageStatus(messageId, { deliveredAt }));
            messagingState.socket.on('message:read', ({ messageIds, readAt }) => (messageIds || []).forEach(id => updateLocalMessageStatus(id, { readAt, isRead: true })));
            messagingState.socket.on('user:online', ({ userId }) => updateConversationPresence(userId, { isOnline: true, lastSeenAt: null }));
            messagingState.socket.on('user:offline', ({ userId, lastSeenAt }) => updateConversationPresence(userId, { isOnline: false, lastSeenAt }));
        }


        function preloadMessagingData() {
            if (!activeUser) return;
            loadBadgeSummary();
            loadConversations(false, { force: false }).catch(error => console.warn('Conversation preload failed', error));
            if (Date.now() - (messagingState.notificationsLoadedAt || 0) > 15000) {
                apiRequest('/api/notifications?limit=30')
                    .then(result => {
                        messagingState.notifications = (result.data || []).filter(item => !isMessageNotification(item));
                        messagingState.notificationsLoadedAt = Date.now();
                        writeMessagingCache();
                    })
                    .catch(error => console.warn('Notification preload failed', error));
            }
        }

        function disconnectRealtime() {
            if (messagingState.socket) {
                messagingState.socket.off('notification:new', handleRealtimeNotificationNew);
                messagingState.socket.off('notification:read', handleRealtimeNotificationRead);
                messagingState.socket.off('notification:read-all', handleRealtimeNotificationsReadAll);
                messagingState.socket.disconnect();
            }
            messagingState.socket = null;
        }

        function closeNotificationsPanel() {
            document.getElementById('notification-panel')?.remove();
            document.getElementById('notification-full-backdrop')?.remove();
            document.removeEventListener('click', handleNotificationOutsideClick, true);
            document.removeEventListener('keydown', handleNotificationKeydown, true);
        }

        function handleNotificationOutsideClick(event) {
            if (event.target.closest('#notification-panel') || event.target.closest('[data-notification-toggle]')) return;
            closeNotificationsPanel();
        }

        function handleNotificationKeydown(event) {
            if (event.key === 'Escape') closeNotificationsPanel();
        }

        function positionNotificationPanel(panel) {
            if (!panel || panel.classList.contains('notification-panel--full')) return;
            const isMobile = window.innerWidth <= 768;
            const mobileBottomToggle = document.getElementById('mobile-bottom-notification-btn');
            const anchor = document.querySelector('[data-notification-toggle]:focus')
                || (isMobile && mobileBottomToggle && !mobileBottomToggle.classList.contains('is-hidden') ? mobileBottomToggle : null)
                || document.querySelector('[data-notification-toggle]');
            const rect = anchor?.getBoundingClientRect();
            const anchoredInBottomNav = Boolean(anchor?.closest?.('#mobile-bottom-nav'));
            const top = Math.max(70, (rect?.bottom || 78) + 8);
            panel.style.bottom = '';
            panel.style.maxHeight = '';
            panel.style.top = `${top}px`;
            if (isMobile) {
                panel.style.left = '10px';
                panel.style.right = '10px';
                if (anchoredInBottomNav) {
                    panel.style.top = 'auto';
                    panel.style.bottom = 'calc(var(--mobile-bottom-nav-height) + 12px + env(safe-area-inset-bottom))';
                    panel.style.maxHeight = 'calc(100dvh - var(--header-height) - var(--mobile-bottom-nav-height) - 24px)';
                }
                return;
            }
            const width = Math.min(380, window.innerWidth - 28);
            panel.style.width = `${width}px`;
            panel.style.left = `${Math.max(14, Math.min(window.innerWidth - width - 14, (rect?.right || window.innerWidth - 18) - width))}px`;
            panel.style.right = 'auto';
        }

        function renderNotificationsPanel({ full = false, loading = false, error = '' } = {}) {
            const notifications = visibleNotifications();
            const body = loading
                ? '<div class="p-4 space-y-2"><div class="h-12 rounded-2xl bg-slate-100 animate-pulse"></div><div class="h-12 rounded-2xl bg-slate-100 animate-pulse"></div></div>'
                : (notifications.length ? notifications.map(renderNotificationItem).join('') : '<div class="p-6 text-center text-slate-500 font-bold">Bildiriş yoxdur</div>');
            const panel = document.getElementById('notification-panel');
            const html = `<div class="flex items-center justify-between gap-3 px-1 pb-2"><strong class="text-slate-950">🔔 Bildirişlər</strong><div class="flex items-center gap-3"><button onclick="openAllNotifications()" class="text-xs font-black text-brand-600">Hamısına bax</button><button onclick="markAllNotificationsRead()" class="text-xs font-black text-brand-600">Hamısını oxu</button>${full ? '<button onclick="closeNotificationsPanel()" class="text-slate-500 hover:text-slate-950 text-lg font-black leading-none" aria-label="Bağla">×</button>' : ''}</div></div><div>${body}</div>${error ? `<div class="notification-inline-error">${escapeHtml(error)}</div>` : ''}`;
            if (full && !document.getElementById('notification-full-backdrop')) document.body.insertAdjacentHTML('beforeend', '<div id="notification-full-backdrop" class="notification-full-backdrop" onclick="closeNotificationsPanel()"></div>');
            if (panel) { panel.className = `notification-panel ${full ? 'notification-panel--full' : ''}`; panel.innerHTML = html; positionNotificationPanel(panel); return; }
            document.body.insertAdjacentHTML('beforeend', `<div id="notification-panel" class="notification-panel ${full ? 'notification-panel--full' : ''}">${html}</div>`);
            positionNotificationPanel(document.getElementById('notification-panel'));
            setTimeout(() => { document.addEventListener('click', handleNotificationOutsideClick, true); document.addEventListener('keydown', handleNotificationKeydown, true); }, 0);
        }

        function markNotificationsReadLocal() {
            const previousUnread = messagingState.notificationsUnread;
            const previousNotifications = messagingState.notifications.map(n => ({ ...n }));
            messagingState.notificationsUnread = 0;
            messagingState.notifications = messagingState.notifications.map(n => isMessageNotification(n) ? n : ({ ...n, isRead: true }));
            refreshHeaderBadges();
            writeMessagingCache();
            return { previousUnread, previousNotifications };
        }

        function restoreNotificationsReadLocal(snapshot) {
            if (!snapshot) return;
            messagingState.notificationsUnread = snapshot.previousUnread;
            messagingState.notifications = snapshot.previousNotifications;
            refreshHeaderBadges();
            writeMessagingCache();
        }

        async function markNotificationsReadAllRequest() {
            const result = await apiRequest('/api/notifications/read-all', { method: 'PATCH' });
            const nextUnread = Number(result?.unreadCount);
            if (Number.isFinite(nextUnread)) messagingState.notificationsUnread = Math.max(0, nextUnread);
            else messagingState.notificationsUnread = 0;
            messagingState.notifications = messagingState.notifications.map(n => isMessageNotification(n) ? n : ({ ...n, isRead: true }));
            refreshHeaderBadges();
            writeMessagingCache();
            return result;
        }

        async function markNotificationsReadOnPanelOpen() {
            if (messagingState.notificationsUnread <= 0) return;
            if (messagingState.notificationsReadAllInFlight) return messagingState.notificationsReadAllInFlight;
            const snapshot = markNotificationsReadLocal();
            updateOpenNotificationsPanel();
            messagingState.notificationsReadAllInFlight = markNotificationsReadAllRequest()
                .catch(error => {
                    restoreNotificationsReadLocal(snapshot);
                    updateOpenNotificationsPanel();
                    console.warn('Notification panel auto-read failed', error);
                    throw error;
                })
                .finally(() => { messagingState.notificationsReadAllInFlight = null; });
            return messagingState.notificationsReadAllInFlight;
        }

        async function toggleNotificationsPanel() {
            const startedAt = performance.now();
            const existing = document.getElementById('notification-panel');
            if (existing && !existing.classList.contains('notification-panel--full')) { closeNotificationsPanel(); return; }
            renderNotificationsPanel({ loading: !visibleNotifications().length });
            perfLog('notifications_open_ms', startedAt);
            try { await markNotificationsReadOnPanelOpen(); } catch (_error) {}
            if (Date.now() - (messagingState.notificationsLoadedAt || 0) < 15000) return;
            try {
                const result = await apiRequest('/api/notifications');
                messagingState.notifications = (result.data || []).filter(item => !isMessageNotification(item));
                messagingState.notificationsLoadedAt = Date.now();
                writeMessagingCache();
                renderNotificationsPanel();
            } catch (error) { renderNotificationsPanel({ error: error.message || 'Bildirişlər yüklənmədi.' }); }
        }

        async function openAllNotifications() {
            closeNotificationsPanel();
            renderNotificationsPanel({ full: true, loading: !visibleNotifications().length });
            try { await markNotificationsReadOnPanelOpen(); } catch (_error) {}
            try {
                const result = await apiRequest('/api/notifications?all=true&limit=1000');
                messagingState.notifications = (result.data || []).filter(item => !isMessageNotification(item));
                messagingState.notificationsLoadedAt = Date.now();
                writeMessagingCache();
                renderNotificationsPanel({ full: true });
            } catch (error) { renderNotificationsPanel({ full: true, error: error.message || 'Bildirişlər yüklənmədi.' }); }
        }

        function safeNotificationArg(value) {
            return encodeURIComponent(String(value || ''));
        }

        function decodeNotificationArg(value) {
            try { return decodeURIComponent(String(value || '')); } catch (_error) { return String(value || ''); }
        }

        function getVideoProvider(url) {
            try {
                const parsed = new URL(url);
                const host = parsed.hostname.toLowerCase();
                if (host.includes('youtu.be') || host.includes('youtube.com')) return 'youtube';
                if (host.includes('vimeo.com')) return 'vimeo';
                if (parsed.pathname.toLowerCase().endsWith('.mp4')) return 'mp4';
            } catch (_error) {}
            return '';
        }

        function youtubeVideoId(url) {
            try {
                const parsed = new URL(url);
                if (parsed.hostname.toLowerCase().includes('youtu.be')) return parsed.pathname.split('/').filter(Boolean)[0] || '';
                if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');
                const parts = parsed.pathname.split('/').filter(Boolean);
                const marker = parts.findIndex(part => ['embed', 'shorts'].includes(part));
                return marker > -1 ? (parts[marker + 1] || '') : '';
            } catch (_error) { return ''; }
        }

        function notificationVideoEmbedUrl(url) {
            const provider = getVideoProvider(url);
            if (provider === 'youtube') {
                const id = youtubeVideoId(url);
                return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0` : '';
            }
            if (provider === 'vimeo') {
                try {
                    const parsed = new URL(url);
                    const id = parsed.pathname.split('/').filter(Boolean).pop();
                    return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1` : '';
                } catch (_error) { return ''; }
            }
            return url;
        }

        function notificationVideoThumb(item) {
            if (item.imageUrl) return item.imageUrl;
            if (getVideoProvider(item.videoUrl) === 'youtube') {
                const id = youtubeVideoId(item.videoUrl);
                if (id) return `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
            }
            return '';
        }

        function renderNotificationMedia(item) {
            if (item.videoUrl) {
                const thumb = notificationVideoThumb(item);
                const media = thumb
                    ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(item.title || 'Video')}" loading="lazy">`
                    : `<div class="notification-video-frame flex items-center justify-center text-white font-black text-sm">Video</div>`;
                return `<div class="notification-media" onclick="event.stopPropagation(); openNotificationVideo('${safeNotificationArg(item.id)}')">${media}<div class="notification-media__play"><i class="fa-solid fa-circle-play"></i></div></div>`;
            }
            if (item.imageUrl) return `<div class="notification-media"><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title || 'Bildiriş')}" loading="lazy"></div>`;
            return '';
        }

        function renderNotificationActions(item) {
            const actions = [];
            if (item.link) actions.push(`<button type="button" class="notification-detail-link" onclick="event.stopPropagation(); openNotification('${safeNotificationArg(item.id)}', '${safeNotificationArg(item.link || '')}', 'link')">Ətraflı bax</button>`);
            if (item.videoUrl) actions.push(`<button type="button" class="notification-video-link" onclick="event.stopPropagation(); openNotification('${safeNotificationArg(item.id)}', '', 'video')">Videoya bax</button>`);
            if (!actions.length) actions.push('<span></span>');
            actions.push(`<div class="notification-action-row__date text-[10px] font-bold text-slate-400">${formatAzDateTime(item.createdAt)}</div>`);
            return actions.join('');
        }

        function renderNotificationItem(item) {
            const defaultAction = item.link ? 'link' : (item.videoUrl ? 'video' : 'link');
            return `<div role="button" tabindex="0" class="notification-item ${item.isRead ? '' : 'is-unread'}" onclick="openNotification('${safeNotificationArg(item.id)}', '${safeNotificationArg(item.link || '')}', '${defaultAction}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}">${renderNotificationMedia(item)}<div class="font-black">${escapeHtml(item.title)}</div><div class="text-xs font-bold text-slate-600 mt-1">${escapeHtml(item.message || '')}</div><div class="notification-action-row">${renderNotificationActions(item)}</div></div>`;
        }

        function closeNotificationVideo() {
            document.getElementById('notification-video-modal')?.remove();
        }

        function markNotificationVideoRead(id) {
            markNotificationReadLocal(id);
            apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => showToast('Bildiriş oxundu kimi işarələnmədi.'));
        }

        function openNotificationExternalVideo(item, id) {
            markNotificationVideoRead(id);
            window.open(item.videoUrl, '_blank', 'noopener,noreferrer');
        }

        function openNotificationVideo(id) {
            id = decodeNotificationArg(id);
            const item = messagingState.notifications.find(n => String(n.id) === String(id) && !isMessageNotification(n));
            if (!item?.videoUrl) return;
            const provider = getVideoProvider(item.videoUrl);
            if (provider === 'youtube' || provider === 'vimeo') {
                openNotificationExternalVideo(item, id);
                return;
            }
            if (provider !== 'mp4') {
                openNotificationExternalVideo(item, id);
                return;
            }
            markNotificationVideoRead(id);
            const player = `<video src="${escapeHtml(item.videoUrl)}" controls autoplay playsinline></video>`;
            closeNotificationVideo();
            document.body.insertAdjacentHTML('beforeend', `<div id="notification-video-modal" class="notification-video-modal" onclick="if(event.target.id==='notification-video-modal') closeNotificationVideo()"><div class="notification-video-modal__card"><div class="notification-video-modal__head"><strong>${escapeHtml(item.title || 'Video')}</strong><button class="notification-video-modal__close" onclick="closeNotificationVideo()" aria-label="Bağla">×</button></div><div class="notification-video-modal__body">${player}</div></div></div>`);
        }

        function markNotificationReadLocal(id) {
            id = decodeNotificationArg(id);
            const item = messagingState.notifications.find(n => String(n.id) === String(id) && !isMessageNotification(n));
            const wasUnread = item && !item.isRead;
            if (item) item.isRead = true;
            if (wasUnread) messagingState.notificationsUnread = Math.max(0, messagingState.notificationsUnread - 1);
            refreshHeaderBadges();
            writeMessagingCache();
            return { item, wasUnread };
        }

        function openNotification(id, link, action = 'link') {
            id = decodeNotificationArg(id);
            link = decodeNotificationArg(link);
            const { item, wasUnread } = markNotificationReadLocal(id);
            closeNotificationsPanel();
            if (action === 'video' && item?.videoUrl) {
                openNotificationVideo(id);
                return;
            }
            if (link) openNotificationLink(link);
            apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => { if (item) item.isRead = false; if (wasUnread) messagingState.notificationsUnread += 1; refreshHeaderBadges(); showToast('Bildiriş oxundu kimi işarələnmədi.'); });
        }

        function openNotificationLink(link) {
            link = decodeNotificationArg(link);
            if (/^https?:\/\//i.test(link)) {
                window.open(link, '_blank', 'noopener,noreferrer');
                return;
            }
            spaNavigate(link.replace(window.location.origin, ''));
        }

        async function markAllNotificationsRead() {
            if (messagingState.notificationsReadAllInFlight) {
                try { await messagingState.notificationsReadAllInFlight; } catch (_error) {}
                return;
            }
            const snapshot = markNotificationsReadLocal();
            const full = document.getElementById('notification-panel')?.classList.contains('notification-panel--full');
            renderNotificationsPanel({ full });
            messagingState.notificationsReadAllInFlight = markNotificationsReadAllRequest()
                .catch(error => {
                    restoreNotificationsReadLocal(snapshot);
                    renderNotificationsPanel({ full, error: error.message || 'Hamısını oxu alınmadı.' });
                })
                .finally(() => { messagingState.notificationsReadAllInFlight = null; });
            await messagingState.notificationsReadAllInFlight;
        }

        function navigateToMessages(conversationId = '') {
            const startedAt = performance.now();
            if (!activeUser) { setPendingAuthRoute('/profil/mesajlar'); switchTab('admin-login'); return; }
            closeNotificationsPanel();
            spaNavigate(`/profil/mesajlar${conversationId ? `?conversation=${encodeURIComponent(conversationId)}` : ''}`);
            perfLog('inbox_open_ms', startedAt);
        }

        function upsertConversationLocal(conversation) {
            if (!conversation) return;
            const sameParticipant = (item) => item?.otherUser?.id && conversation?.otherUser?.id && String(item.otherUser.id) === String(conversation.otherUser.id);
            messagingState.conversations = [conversation, ...messagingState.conversations.filter(c => String(c.id) !== String(conversation.id) && !sameParticipant(c))];
        }

        function updateConversationPresence(userId, presence = {}) {
            if (!userId) return;
            let changed = false;
            messagingState.conversations.forEach(conversation => {
                if (String(conversation.otherUser?.id) === String(userId)) {
                    conversation.otherUser = { ...conversation.otherUser, ...presence };
                    changed = true;
                }
            });
            if (String(messagingState.activeConversation?.otherUser?.id) === String(userId)) {
                messagingState.activeConversation.otherUser = { ...messagingState.activeConversation.otherUser, ...presence };
                changed = true;
            }
            if (changed) {
                renderConversations();
                if (messagingState.activeConversation) renderChatWindow(messagingState.activeConversation, messagingState.activeMessages);
                writeMessagingCache();
            }
        }

        async function loadConversations(render = true, { force = false, autoSelect = false } = {}) {
            if (!activeUser) return;
            if (!force && Date.now() - (messagingState.conversationsLoadedAt || 0) < 15000) { if (render) renderConversations(); return; }
            if (messagingState.conversationsRequest) {
                try { await messagingState.conversationsRequest; } catch (_error) {}
                if (render) renderConversations();
                return;
            }
            messagingState.conversationsLoading = true;
            if (render && !messagingState.conversations.length) renderConversations(true);
            try {
                messagingState.conversationsRequest = apiRequest('/api/messages');
                const result = await messagingState.conversationsRequest;
                messagingState.conversations = result.data || [];
                messagingState.conversationsLoadedAt = Date.now();
                writeMessagingCache();
                if (render) renderConversations();
                const params = new URLSearchParams(window.location.search);
                const conversationId = params.get('conversation');
                if (conversationId && String(messagingState.activeConversationId) !== String(conversationId)) openConversation(conversationId);
                else if (autoSelect && !messagingState.activeConversationId) {
                    const targetConversation = messagingState.conversations.find(c => Number(c.unreadCount || 0) > 0) || messagingState.conversations[0];
                    if (targetConversation) openConversation(targetConversation.id);
                }
            } finally { messagingState.conversationsLoading = false; messagingState.conversationsRequest = null; }
        }

        const LISTING_CONTEXT_PREFIX = '__BESTHOME_LISTING_CONTEXT__';

        function messageListingContext(message) {
            if (!message) return null;
            if (String(message.type || '').toLowerCase() === 'listing_context') return message.metadata?.listing || message.metadata || message.listing || null;
            if (message.metadata?.listingContext) return message.metadata.listingContext;
            if (message.metadata?.listing_context) return message.metadata.listing_context;
            const text = String(message?.text || '');
            if (!text.startsWith(LISTING_CONTEXT_PREFIX)) return null;
            try { return JSON.parse(text.slice(LISTING_CONTEXT_PREFIX.length)); } catch (_error) { return null; }
        }

        function conversationPreviewText(conversation) {
            if (conversation?.pending) return 'Söhbət açılır…';
            if (conversation?.lastMessage?.deletedAt) return 'Bu mesaj silindi';
            const context = messageListingContext(conversation?.lastMessage);
            if (context) return context.title || conversation?.listing?.title || 'Elan konteksti';
            return conversation?.lastMessage?.text || conversation?.listing?.title || 'Yeni söhbət';
        }

        function conversationActionMenu(id) {
            if (!id || String(id).startsWith('pending-')) return '';
            return `<button type="button" class="conversation-item__menu" onclick="event.stopPropagation(); showConversationActions('${escapeHtml(id)}')" aria-label="Söhbət menyusu">⋯</button>`;
        }

        function renderConversations(loading = false) {
            const root = document.getElementById('conversation-list-root');
            if (!root) return;
            const pending = messagingState.pendingConversation ? [messagingState.pendingConversation] : [];
            const conversations = [...pending, ...messagingState.conversations.filter(c => !pending.some(p => String(p.id) === String(c.id)))];
            if (!conversations.length && loading) { root.innerHTML = '<div class="p-4 space-y-2"><div class="h-14 rounded-2xl bg-slate-100 animate-pulse"></div><div class="h-14 rounded-2xl bg-slate-100 animate-pulse"></div></div>'; return; }
            root.innerHTML = conversations.length ? conversations.map(c => {
                const name = c.otherUser?.fullname || c.placeholderName || 'İstifadəçi';
                return `<div class="conversation-item ${String(c.id) === String(messagingState.activeConversationId) ? 'is-active' : ''} ${c.pending ? 'opacity-70' : ''}" onclick="openConversation('${c.id}')"><img src="${escapeHtml(c.otherUser?.avatarUrl || avatarFallback(name))}" class="w-10 h-10 rounded-full object-cover"><span class="min-w-0 flex-1"><strong class="block truncate">${escapeHtml(name)} ${c.unreadCount ? `(${c.unreadCount})` : ''}</strong><small class="block truncate text-slate-500 font-bold">${escapeHtml(conversationPreviewText(c))}</small></span>${c.unreadCount ? `<b class="rounded-full bg-red-500 text-white text-[10px] px-2 py-1">${c.unreadCount}</b>` : ''}${conversationActionMenu(c.id)}</div>`;
            }).join('') : '<div class="p-8 text-center text-slate-500 font-bold">Söhbət yoxdur</div>';
        }

        function listingChatCard(listing) {
            if (!listing) return '';
            const img = listing.imageUrl || listing.images?.[0]?.imageUrl || listing.images?.[0]?.url || '';
            const code = listing.listingCode || listing.listing_code || listing.code || listing.id;
            const location = [listing.district, listing.settlement, listing.city].filter(Boolean).join(', ');
            const price = formatPrice(listing.price, listing.currency || 'AZN');
            return `<button type="button" onclick="openMessageListingCard(event, '${escapeHtml(code)}')" class="listing-chat-card text-left hover:border-brand-300 hover:bg-brand-50 transition"><div class="listing-chat-card__eyebrow">Bu elan haqqında yazılır</div>${img ? `<img src="${escapeHtml(img)}" class="w-16 h-14 rounded-2xl object-cover" alt="">` : ''}<div class="min-w-0"><div class="text-xs font-black text-brand-600">Elan #${escapeHtml(code)}</div><strong class="block truncate">${escapeHtml(listing.title || 'Elan')}</strong><div class="text-xs font-bold text-slate-500 truncate">${escapeHtml(location || 'Məkan göstərilməyib')}</div><div class="text-xs font-black text-slate-900">${escapeHtml(price)}</div><span class="listing-chat-card__cta">Elana bax</span></div></button>`;
        }

        function openMessageListingCard(event, listingKey) {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            const opener = getListingDetailModalOpener();
            if (opener && listingKey) return opener(String(listingKey));
            if (listingKey) navigateToListingPreview(listingKey);
        }

        function formatAzRelativeTime(value) {
            const date = value ? new Date(value) : null;
            if (!date || Number.isNaN(date.getTime())) return '';
            const diffMs = Date.now() - date.getTime();
            if (diffMs < 0) return formatAzDateTime(value);
            const minutes = Math.max(1, Math.floor(diffMs / 60000));
            if (minutes < 60) return `${minutes} dəqiqə əvvəl`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours} saat əvvəl`;
            if (hours < 48) return 'dünən';
            const days = Math.floor(hours / 24);
            if (days < 7) return `${days} gün əvvəl`;
            return formatAzDate(value);
        }

        function conversationPresenceLine(user) {
            if (user?.isOnline === true) return '<div class="text-xs text-emerald-600 font-black">● Online</div>';
            const relative = formatAzRelativeTime(user?.lastSeenAt);
            return relative ? `<div class="text-xs text-slate-500 font-bold">Son görülmə: ${escapeHtml(relative)}</div>` : '';
        }

        async function openConversation(id) {
            if (!id) return;
            messagingState.activeConversationId = String(id);
            const startedAt = performance.now();
            const cached = messagingState.conversations.find(c => String(c.id) === String(id)) || (String(messagingState.pendingConversation?.id) === String(id) ? messagingState.pendingConversation : null);
            const cachedUnreadCount = Number(cached?.unreadCount || 0);
            const cachedMessages = messagingState.messagesByConversation.get(String(id)) || [];
            messagingState.activeMessages = cachedMessages.slice();
            renderConversations();
            renderChatWindow(cached || { placeholderName: 'Söhbət', pending: true }, messagingState.activeMessages, !cachedMessages.length);
            perfLog('conversation_open_ms', startedAt);
            if (String(id).startsWith('pending-')) return;
            try {
                const historyStartedAt = performance.now();
                let request = messagingState.conversationRequests.get(String(id));
                if (!request) {
                    request = apiRequest(`/api/messages/conversations/${encodeURIComponent(id)}?limit=30`);
                    messagingState.conversationRequests.set(String(id), request);
                }
                const result = await request;
                if (String(messagingState.activeConversationId) !== String(id)) {
                    if (result.messages) messagingState.messagesByConversation.set(String(id), result.messages || []);
                    if (result.conversation) upsertConversationLocal(result.conversation);
                    writeMessagingCache();
                    return;
                }
                messagingState.activeConversation = result.conversation;
                messagingState.activeMessages = result.messages || [];
                messagingState.messagesByConversation.set(String(id), messagingState.activeMessages);
                messagingState.messagesUnread = Math.max(0, messagingState.messagesUnread - cachedUnreadCount);
                refreshHeaderBadges();
                const idx = messagingState.conversations.findIndex(c => String(c.id) === String(id));
                if (idx > -1) messagingState.conversations[idx] = { ...messagingState.conversations[idx], ...result.conversation, unreadCount: 0 };
                else if (result.conversation) upsertConversationLocal(result.conversation);
                renderConversations();
                writeMessagingCache();
                renderChatWindow(result.conversation, messagingState.activeMessages);
                perfLog('message_history_load_ms', historyStartedAt);
            } catch (error) {
                const root = document.getElementById('chat-window-root');
                if (root) root.innerHTML = `<div class="flex-1 flex items-center justify-center text-red-600 font-bold p-8 text-center">${escapeHtml(error.message || 'Söhbət açılmadı.')}</div>`;
            } finally {
                messagingState.conversationRequests.delete(String(id));
            }
        }

        function messageStatus(message) {
            if (message.failed) return '<button type="button" onclick="retryFailedMessage(\'' + escapeHtml(message.id) + '\')" class="message-status text-red-600">Təkrar göndər</button>';
            if (String(message.senderId) !== String(activeUser?.id) || message.deletedAt) return '';
            if (message.readAt) return '<span class="message-status is-read">✓✓</span>';
            if (message.deliveredAt) return '<span class="message-status">✓✓</span>';
            return `<span class="message-status">${message.pending ? '◷' : '✓'}</span>`;
        }

        function messageMenu(message) {
            if (!message || message.pending || message.failed || message.deletedAt || String(message.senderId) !== String(activeUser?.id)) return '';
            return `<button type="button" class="chat-bubble__menu" onclick="event.stopPropagation(); deleteOwnMessage('${escapeHtml(message.id)}')" aria-label="Mesaj menyusu">⋯</button>`;
        }

        function renderMessageBubble(message) {
            const context = messageListingContext(message);
            if (context) return '';
            const mine = String(message.senderId) === String(activeUser.id);
            const deleted = Boolean(message.deletedAt);
            const text = deleted ? 'Bu mesaj silindi' : (message.text || '');
            return `<div class="chat-bubble ${mine ? 'is-mine' : ''} ${deleted ? 'is-deleted' : ''} ${message.pending ? 'opacity-70' : ''} ${message.failed ? 'border border-red-300 bg-red-50' : ''}" data-message-id="${escapeHtml(message.id)}">${messageMenu(message)}<span>${escapeHtml(text)}</span>${messageStatus(message)}<div class="text-[10px] opacity-60 mt-1">${formatAzDateTime(message.createdAt)}</div></div>`;
        }

        function renderChatWindow(conversation, messages, loading = false) {
            const root = document.getElementById('chat-window-root');
            if (!root) return;
            messagingState.activeConversation = conversation || messagingState.activeConversation;
            const otherName = conversation?.otherUser?.fullname || conversation?.placeholderName || 'İstifadəçi';
            const loader = loading ? '<div class="typing-placeholder">Söhbət yüklənir…</div>' : '';
            const listingContext = conversation?.listing || (messages || []).map(messageListingContext).find(Boolean);
            const visibleMessages = (messages || []).filter(message => !messageListingContext(message));
            const presenceLine = conversationPresenceLine(conversation?.otherUser);
            const clearButton = conversation?.id && !String(conversation.id).startsWith('pending-') ? `<button type="button" onclick="clearActiveConversation()" class="text-xs font-black text-slate-500 hover:text-brand-600">Söhbəti təmizlə</button>` : '';
            root.innerHTML = `<div class="p-4 border-b border-slate-200 flex items-center justify-between gap-3"><div><strong class="text-slate-950">${escapeHtml(otherName)}</strong>${presenceLine}</div>${clearButton}</div>${listingChatCard(listingContext)}${loader}<div id="chat-messages" class="chat-messages">${visibleMessages.map(renderMessageBubble).join('')}</div><form onsubmit="sendChatMessage(event)" class="p-4 border-t border-slate-200 flex gap-2"><input id="chat-message-input" class="flex-1 rounded-2xl border border-slate-200 px-4 py-3 font-bold focus:outline-none focus:border-brand-500" placeholder="Mesaj yazın…" autocomplete="off"><button class="rounded-2xl bg-brand-600 hover:bg-brand-700 text-white px-5 font-black">Göndər</button></form>`;
            document.getElementById('chat-messages')?.scrollTo({ top: 999999 });
        }


        function replaceMessageEverywhere(updatedMessage) {
            if (!updatedMessage) return;
            const updateRows = (rows = []) => rows.map(item => String(item.id) === String(updatedMessage.id) ? { ...item, ...updatedMessage, text: 'Bu mesaj silindi' } : item);
            messagingState.activeMessages = updateRows(messagingState.activeMessages);
            messagingState.messagesByConversation.forEach((rows, key) => messagingState.messagesByConversation.set(key, updateRows(rows)));
            messagingState.conversations.forEach(conversation => {
                if (String(conversation.lastMessage?.id) === String(updatedMessage.id)) conversation.lastMessage = { ...conversation.lastMessage, ...updatedMessage, text: 'Bu mesaj silindi' };
            });
            if (String(updatedMessage.conversationId) === String(messagingState.activeConversationId)) renderChatWindow(messagingState.activeConversation, messagingState.activeMessages);
            renderConversations();
            writeMessagingCache();
        }

        function handleRealtimeMessageDeleted(message) {
            replaceMessageEverywhere(message);
        }

        function handleRealtimeConversationHidden(conversationId) {
            const hiddenConversation = messagingState.conversations.find(c => String(c.id) === String(conversationId));
            messagingState.messagesUnread = Math.max(0, messagingState.messagesUnread - Number(hiddenConversation?.unreadCount || 0));
            refreshHeaderBadges();
            messagingState.conversations = messagingState.conversations.filter(c => String(c.id) !== String(conversationId));
            if (String(messagingState.activeConversationId) === String(conversationId)) {
                messagingState.activeConversationId = null;
                messagingState.activeConversation = null;
                messagingState.activeMessages = [];
                const root = document.getElementById('chat-window-root');
                if (root) root.innerHTML = '<div class="flex-1 flex items-center justify-center text-slate-500 font-bold p-8 text-center">Söhbət siyahıdan silindi.</div>';
            }
            renderConversations();
            writeMessagingCache();
        }

        async function deleteOwnMessage(messageId) {
            if (!messageId || !confirm('Mesaj silinsin?')) return;
            const msg = messagingState.activeMessages.find(m => String(m.id) === String(messageId));
            if (!msg || String(msg.senderId) !== String(activeUser?.id)) return showToast('Yalnız öz mesajınızı silə bilərsiniz.');
            try {
                const result = await apiRequest(`/api/messages/messages/${encodeURIComponent(messageId)}`, { method: 'DELETE' });
                replaceMessageEverywhere(result.message);
            } catch (error) { showToast(error.message || 'Mesaj silinmədi.'); }
        }

        async function showConversationActions(conversationId) {
            if (!conversationId) return;
            const action = prompt('Söhbət əməliyyatı:\n1 - Söhbəti sil/gizlət\n2 - Söhbəti təmizlə', '1');
            if (action === '1') return hideConversation(conversationId);
            if (action === '2') return clearConversation(conversationId);
        }

        async function hideConversation(conversationId) {
            if (!conversationId || !confirm('Söhbət siyahıdan silinsin?')) return;
            try {
                await apiRequest(`/api/messages/conversations/${encodeURIComponent(conversationId)}/hide`, { method: 'PATCH' });
                handleRealtimeConversationHidden(conversationId);
            } catch (error) { showToast(error.message || 'Söhbət silinmədi.'); }
        }

        async function clearConversation(conversationId) {
            if (!conversationId) return;
            try {
                await apiRequest(`/api/messages/conversations/${encodeURIComponent(conversationId)}/clear`, { method: 'PATCH' });
                messagingState.messagesByConversation.set(String(conversationId), []);
                if (String(messagingState.activeConversationId) === String(conversationId)) {
                    messagingState.activeMessages = [];
                    renderChatWindow(messagingState.activeConversation, []);
                }
                showToast('Söhbət təmizləndi.');
                writeMessagingCache();
            } catch (error) { showToast(error.message || 'Söhbət təmizlənmədi.'); }
        }

        function clearActiveConversation() {
            if (!messagingState.activeConversationId || !confirm('Söhbət təmizlənsin?')) return;
            clearConversation(messagingState.activeConversationId);
        }

        async function sendChatMessage(event) {
            event.preventDefault();
            const input = document.getElementById('chat-message-input');
            const text = input.value.trim();
            if (!text || !messagingState.activeConversationId || String(messagingState.activeConversationId).startsWith('pending-')) return;
            const startedAt = performance.now();
            const tempId = `tmp-${Date.now()}`;
            input.value = '';
            const optimistic = { id: tempId, conversationId: messagingState.activeConversationId, senderId: activeUser.id, text, createdAt: new Date().toISOString(), pending: true };
            messagingState.activeMessages.push(optimistic);
            messagingState.messagesByConversation.set(String(messagingState.activeConversationId), messagingState.activeMessages);
            renderChatWindow(messagingState.activeConversation, messagingState.activeMessages);
            perfLog('message optimistic append ms', startedAt);
            document.getElementById('chat-message-input')?.focus();
            try {
                const sendKey = `${messagingState.activeConversationId}:${tempId}`;
                const request = apiRequest(`/api/messages/conversations/${encodeURIComponent(messagingState.activeConversationId)}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
                messagingState.sendRequests.set(sendKey, request);
                const result = await request;
                messagingState.sendRequests.delete(sendKey);
                const idx = messagingState.activeMessages.findIndex(m => m.id === tempId);
                if (idx > -1) messagingState.activeMessages[idx] = result.message;
                else messagingState.activeMessages.push(result.message);
                messagingState.messagesByConversation.set(String(messagingState.activeConversationId), messagingState.activeMessages);
                messagingState.seenMessageIds.add(String(result.message.id));
                const conv = messagingState.conversations.find(c => String(c.id) === String(messagingState.activeConversationId));
                if (conv) { conv.lastMessage = result.message; conv.updatedAt = result.message.createdAt; }
                renderChatWindow(messagingState.activeConversation || conv || {}, messagingState.activeMessages);
                renderConversations();
                writeMessagingCache();
            } catch (error) {
                messagingState.sendRequests.delete(`${messagingState.activeConversationId}:${tempId}`);
                const msg = messagingState.activeMessages.find(m => m.id === tempId);
                if (msg) { msg.pending = false; msg.failed = true; msg.errorText = error.message; }
                renderChatWindow(messagingState.activeConversation, messagingState.activeMessages);
                showToast(error.message || 'Mesaj göndərilmədi.');
            }
        }

        function retryFailedMessage(id) {
            const msg = messagingState.activeMessages.find(m => String(m.id) === String(id));
            if (!msg) return;
            const input = document.getElementById('chat-message-input');
            if (input) input.value = msg.text;
            messagingState.activeMessages = messagingState.activeMessages.filter(m => String(m.id) !== String(id));
            renderChatWindow(messagingState.activeConversation, messagingState.activeMessages);
            input?.focus();
        }

        function updateLocalMessageStatus(messageId, patch) {
            const msg = messagingState.activeMessages.find(m => String(m.id) === String(messageId));
            if (msg) { Object.assign(msg, patch); renderChatWindow(messagingState.activeConversation || messagingState.conversations.find(c => String(c.id) === String(messagingState.activeConversationId)) || {}, messagingState.activeMessages); }
        }

        async function startListingConversation(listingId) {
            const startedAt = performance.now();
            closeListingModalForMessageNavigation();
            if (!activeUser) { setPendingAuthRoute(`/listing/${listingId}`); switchTab('admin-login'); return; }
            const pendingId = `pending-${Date.now()}`;
            const listing = appData.listings?.find(item => String(item.id) === String(listingId)) || null;
            messagingState.pendingConversation = { id: pendingId, pending: true, placeholderName: 'Satıcı', listing };
            messagingState.activeConversationId = pendingId;
            messagingState.activeMessages = [];
            navigateToMessages();
            renderConversations();
            renderChatWindow(messagingState.pendingConversation, [], false);
            perfLog('seller_chat_open_ms', startedAt);
            try {
                const result = await apiRequest('/api/messages/conversations', { method: 'POST', body: JSON.stringify({ listingId }) });
                messagingState.pendingConversation = null;
                messagingState.activeConversationId = String(result.conversation.id);
                upsertConversationLocal(result.conversation);
                history.replaceState({ tabId: 'messages' }, '', `/profil/mesajlar?conversation=${encodeURIComponent(result.conversation.id)}`);
                renderConversations();
                openConversation(result.conversation.id);
            } catch (error) { messagingState.pendingConversation = null; renderConversations(); showToast(error.message || 'Söhbət yaradıla bilmədi.'); }
        }


        window.openConversation = openConversation;
        window.openChat = openConversation;
        window.sendMessage = sendChatMessage;
        window.sendChatMessage = sendChatMessage;
        window.startListingConversation = startListingConversation;
        window.deleteOwnMessage = deleteOwnMessage;
        window.showConversationActions = showConversationActions;
        window.retryFailedMessage = retryFailedMessage;
        window.clearActiveConversation = clearActiveConversation;
        window.hideConversation = hideConversation;
        window.clearConversation = clearConversation;
        window.messagingState = messagingState;
