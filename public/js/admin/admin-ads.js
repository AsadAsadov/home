function adminAdOrder() {
    return (Array.isArray(appData.ads) ? appData.ads : [])
        .slice()
        .sort((a, b) => (Number(a.rotationOrder || 0) - Number(b.rotationOrder || 0)) || (Number(a.displayOrder || 0) - Number(b.displayOrder || 0)) || Number(a.id || 0) - Number(b.id || 0));
}


let isAdFormOpen = false;

function setAdFormOpen(isOpen) {
    isAdFormOpen = Boolean(isOpen);
    const formCard = document.getElementById('admin-ad-form-card');
    const toggleBtn = document.getElementById('ad-form-toggle-btn');
    if (formCard) formCard.classList.toggle('hidden', !isAdFormOpen);
    if (toggleBtn) toggleBtn.textContent = isAdFormOpen ? 'Bağla' : '+ Yeni Reklam';
}

function openAdForm() {
    setAdFormOpen(true);
}

function closeAdForm() {
    resetAdForm();
    setAdFormOpen(false);
}

function toggleAdForm() {
    if (isAdFormOpen) closeAdForm();
    else { resetAdForm(); openAdForm(); }
}

function extractResponseItems(response, keys = []) {
    if (Array.isArray(response)) return response;
    if (!response || typeof response !== 'object') return [];
    for (const key of keys) {
        const value = response?.[key];
        if (Array.isArray(value)) return value;
    }
    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        for (const key of keys) {
            const value = response.data?.[key];
            if (Array.isArray(value)) return value;
        }
        if (Array.isArray(response.data.items)) return response.data.items;
        if (Array.isArray(response.data.gallery)) return response.data.gallery;
    }
    if (Array.isArray(response?.data?.items)) return response.data.items;
    if (Array.isArray(response?.data?.gallery)) return response.data.gallery;
    if (Array.isArray(response?.data)) return response.data;
    return [];
}

function adminAdMediaPreview(ad) {
    return `<div class="w-24 h-28 shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">${renderAdMedia(ad, 'w-full h-full', { loop: true })}</div>`;
}

function renderAdminAdStats() {
    const container = document.getElementById('admin-ad-stats');
    if (!container) return;
    const localAds = Array.isArray(appData.ads) ? appData.ads : [];
    const stats = appData.adStats || {};
    const cards = [
        ['Cəmi', stats.totalAds ?? localAds.length],
        ['Aktiv', stats.activeAds ?? localAds.filter(ad => ad.isActive).length],
        ['Baxışlar', stats.totalViews ?? localAds.reduce((sum, ad) => sum + Number(ad.viewCount || 0), 0)],
        ['Kliklər', stats.totalClicks ?? localAds.reduce((sum, ad) => sum + Number(ad.clickCount || 0), 0)]
    ];
    container.innerHTML = cards.map(([label, value]) => `<div class="rounded-2xl border border-white/10 bg-white/5 p-3"><div class="text-lg font-black text-white">${Number(value || 0).toLocaleString('az-AZ')}</div><div class="text-[10px] uppercase font-bold text-gray-400">${label}</div></div>`).join('');
}

function renderAdminAds() {
    renderAdminAdStats();
    const list = document.getElementById('admin-ads-list');
    if (!list) return;
    const ads = adminAdOrder();
    if (dataLoadState.ads.loading && ads.length === 0) {
        list.innerHTML = '<div class="glass-card p-6 rounded-2xl text-center text-sm text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Reklamlar yüklənir…</div>';
        return;
    }
    if (dataLoadState.ads.error && ads.length === 0) {
        list.innerHTML = '<div class="glass-card p-6 rounded-2xl text-center text-sm font-bold text-red-300">Məlumat yüklənmədi. Yenidən cəhd edin.</div>';
        return;
    }
    if (ads.length === 0) {
        list.innerHTML = '<div class="glass-card p-6 rounded-2xl text-center text-sm font-bold text-gray-400">Məlumat yoxdur</div>';
        return;
    }
    list.innerHTML = ads.map((ad, index) => `
        <article class="admin-ad-card glass-card p-3 rounded-2xl flex gap-3 items-center text-xs" data-ad-id="${escapeHtml(ad.id)}">
            <button type="button" class="admin-ad-drag-handle shrink-0 bg-white/5 hover:bg-brand-500/20 text-gray-300 hover:text-white w-10 h-10 rounded-xl transition" onpointerdown="startAdDrag(event, '${escapeHtml(ad.id)}')" aria-label="Reklam sırasını dəyiş"><i class="fa-solid fa-grip-vertical"></i></button>
            ${adminAdMediaPreview(ad)}
            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="font-black text-white truncate">${escapeHtml(ad.title || 'Reklam')}</span>
                    <span class="rounded-full ${ad.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'} px-2 py-0.5 text-[10px] font-bold">${ad.isActive ? 'Aktiv' : 'Passiv'}</span>
                    <span class="rounded-full bg-brand-500/15 text-brand-200 px-2 py-0.5 text-[10px] font-bold">#${index + 1}</span>
                </div>
                <div class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-bold text-gray-300">
                    <span class="rounded-lg bg-white/5 px-2 py-1">Tip: ${escapeHtml(ad.mediaType || 'image')}</span>
                    <span class="rounded-lg bg-white/5 px-2 py-1">Yer: ${escapeHtml(ad.position || 'left')}</span>
                    <span class="rounded-lg bg-white/5 px-2 py-1">Sıra: ${Number(ad.displayOrder ?? index + 1)} / ${Number(ad.rotationOrder ?? index + 1)}</span>
                    <span class="rounded-lg bg-white/5 px-2 py-1">👁 ${Number(ad.viewCount || 0).toLocaleString('az-AZ')}</span>
                    <span class="rounded-lg bg-white/5 px-2 py-1">🖱 ${Number(ad.clickCount || 0).toLocaleString('az-AZ')}</span>
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 shrink-0">
                <button type="button" onclick="moveAd(${ad.id}, -1)" ${index === 0 ? 'disabled' : ''} class="text-gray-300 px-3 py-2 bg-white/5 hover:bg-white/15 rounded-xl transition disabled:opacity-40" aria-label="Yuxarı"><i class="fa-solid fa-arrow-up"></i></button>
                <button type="button" onclick="moveAd(${ad.id}, 1)" ${index === ads.length - 1 ? 'disabled' : ''} class="text-gray-300 px-3 py-2 bg-white/5 hover:bg-white/15 rounded-xl transition disabled:opacity-40" aria-label="Aşağı"><i class="fa-solid fa-arrow-down"></i></button>
                <button type="button" onclick="editAd(${ad.id})" class="text-blue-400 px-3 py-2 bg-blue-500/10 hover:bg-blue-500 hover:text-white rounded-xl transition">Redaktə</button>
                <button type="button" onclick="toggleAdStatus(${ad.id}, ${!ad.isActive})" class="${ad.isActive ? 'text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500' : 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500'} hover:text-white px-3 py-2 rounded-xl transition">${ad.isActive ? 'Deaktiv et' : 'Aktiv et'}</button>
                <button type="button" onclick="deleteAd(${ad.id})" class="text-red-400 px-3 py-2 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl transition"><i class="fa-solid fa-trash"></i></button>
            </div>
        </article>
    `).join('');
}

async function loadAdminAds({ force = true } = {}) {
    if (!isAdminRole(activeUser?.role) || !getAuthToken()) return [];
    if (dataLoadState.ads.loading && !force) return appData.ads || [];
    dataLoadState.ads.loading = true;
    dataLoadState.ads.error = '';
    renderAdminAds();
    try {
        const [adsResponse, statsResponse] = await Promise.all([
            apiRequest('/api/site-ads?admin=true', { authRedirect: false }),
            apiRequest('/api/site-ads/stats', { authRedirect: false }).catch(() => null)
        ]);
        const rows = extractResponseItems(adsResponse, ['ads', 'items']);
        cacheData('ads', rows.map(dbAdToUi));
        if (statsResponse) appData.adStats = statsResponse;
        dataLoadState.ads.loaded = true;
        return appData.ads;
    } catch (error) {
        dataLoadState.ads.error = 'Məlumat yüklənmədi. Yenidən cəhd edin.';
        return appData.ads || [];
    } finally {
        dataLoadState.ads.loading = false;
        renderAdminAds();
        renderDesktopAds({ force: true });
    }
}

function adFormValue(id) { return document.getElementById(id)?.value?.trim?.() || ''; }

function buildAdFormData() {
    const formData = new FormData();
    formData.append('title', adFormValue('ad-title'));
    formData.append('media_type', adFormValue('ad-media-type') || 'image');
    formData.append('position', adFormValue('ad-position') || 'left');
    formData.append('media_url', adFormValue('ad-media-url'));
    formData.append('click_url', adFormValue('ad-click-url'));
    formData.append('display_order', adFormValue('ad-display-order') || '0');
    formData.append('rotation_order', adFormValue('ad-rotation-order') || '0');
    formData.append('repeat_count', adFormValue('ad-repeat-count') || String(AD_DEFAULT_REPEAT_COUNT));
    formData.append('display_duration', adFormValue('ad-display-duration') || String(AD_DEFAULT_DISPLAY_DURATION_SECONDS));
    formData.append('width_px', adFormValue('ad-width-px') || String(AD_DIMENSION_DEFAULTS.width));
    formData.append('height_px', adFormValue('ad-height-px') || String(AD_DIMENSION_DEFAULTS.height));
    formData.append('object_fit', adFormValue('ad-object-fit') || AD_DIMENSION_DEFAULTS.objectFit);
    formData.append('is_active', document.getElementById('ad-is-active')?.checked ? 'true' : 'false');
    if (adFormValue('ad-start-date')) formData.append('start_date', adFormValue('ad-start-date'));
    if (adFormValue('ad-end-date')) formData.append('end_date', adFormValue('ad-end-date'));
    const file = document.getElementById('ad-media-file')?.files?.[0];
    if (file) formData.append('media', file);
    return formData;
}

async function refreshAdsAndStats() {
    await loadAdminAds({ force: true }).catch(() => {});
    await refreshAdminStats({ render: true }).catch(() => {});
}

async function handleSaveAd(event) {
    event.preventDefault();
    setAdSaveButtonLoading(true);
    const editId = adFormValue('edit-ad-id');
    try {
        const saved = await apiRequest(editId ? `/api/site-ads/${editId}` : '/api/site-ads', editId ? 'PUT' : 'POST', buildAdFormData());
        if (saved) upsertCachedItem('ads', dbAdToUi(saved));
        resetAdForm();
        setAdFormOpen(false);
        await refreshAdsAndStats();
    } catch (error) {
        alert('Reklam yadda saxlanılmadı: ' + error.message);
    } finally {
        setAdSaveButtonLoading(false);
    }
}

function editAd(id) {
    const ad = (appData.ads || []).find(item => String(item.id) === String(id));
    if (!ad) return;
    document.getElementById('edit-ad-id').value = ad.id;
    document.getElementById('ad-title').value = ad.title || '';
    document.getElementById('ad-media-type').value = ad.mediaType || 'image';
    document.getElementById('ad-position').value = ad.position || 'left';
    document.getElementById('ad-media-url').value = ad.mediaUrl || '';
    document.getElementById('ad-click-url').value = ad.clickUrl || '';
    document.getElementById('ad-display-order').value = ad.displayOrder ?? 0;
    document.getElementById('ad-rotation-order').value = ad.rotationOrder ?? 0;
    document.getElementById('ad-repeat-count').value = ad.repeatCount ?? AD_DEFAULT_REPEAT_COUNT;
    document.getElementById('ad-display-duration').value = ad.displayDuration ?? AD_DEFAULT_DISPLAY_DURATION_SECONDS;
    document.getElementById('ad-width-px').value = ad.widthPx ?? AD_DIMENSION_DEFAULTS.width;
    document.getElementById('ad-height-px').value = ad.heightPx ?? AD_DIMENSION_DEFAULTS.height;
    document.getElementById('ad-object-fit').value = ad.objectFit || AD_DIMENSION_DEFAULTS.objectFit;
    document.getElementById('ad-is-active').checked = Boolean(ad.isActive);
    document.getElementById('ad-start-date').value = ad.startDate || '';
    document.getElementById('ad-end-date').value = ad.endDate || '';
    const file = document.getElementById('ad-media-file');
    if (file) file.value = '';
    document.getElementById('ad-form-title').textContent = 'Reklamı Redaktə Et';
    openAdForm();
    updateAdPreview();
}

function resetAdForm() {
    ['edit-ad-id','ad-title','ad-media-url','ad-click-url','ad-start-date','ad-end-date'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const values = { 'ad-media-type': 'image', 'ad-position': 'left', 'ad-display-order': '0', 'ad-rotation-order': '0', 'ad-repeat-count': String(AD_DEFAULT_REPEAT_COUNT), 'ad-display-duration': String(AD_DEFAULT_DISPLAY_DURATION_SECONDS), 'ad-width-px': String(AD_DIMENSION_DEFAULTS.width), 'ad-height-px': String(AD_DIMENSION_DEFAULTS.height), 'ad-object-fit': AD_DIMENSION_DEFAULTS.objectFit };
    Object.entries(values).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.value = value; });
    const active = document.getElementById('ad-is-active');
    if (active) active.checked = true;
    const file = document.getElementById('ad-media-file');
    if (file) file.value = '';
    const title = document.getElementById('ad-form-title');
    if (title) title.textContent = 'Yeni Reklam';
    updateAdPreview();
}

function updateAdPreview() {
    const preview = document.getElementById('ad-admin-preview');
    if (!preview) return;
    const file = document.getElementById('ad-media-file')?.files?.[0];
    const mediaUrl = file ? URL.createObjectURL(file) : adFormValue('ad-media-url');
    if (!mediaUrl) {
        preview.innerHTML = 'Media URL daxil edin';
        return;
    }
    const ad = dbAdToUi({ title: adFormValue('ad-title') || 'Reklam', mediaType: adFormValue('ad-media-type') || (file?.type?.startsWith('video/') ? 'video' : 'image'), mediaUrl, widthPx: 180, heightPx: 120, objectFit: adFormValue('ad-object-fit') || 'cover', isActive: true });
    preview.innerHTML = renderAdMedia(ad, 'w-full h-full', { loop: true });
}

function handleAdMediaFileSelection() {
    const file = document.getElementById('ad-media-file')?.files?.[0];
    if (file?.type?.startsWith('video/')) document.getElementById('ad-media-type').value = 'video';
    else if (file?.type === 'image/gif') document.getElementById('ad-media-type').value = 'gif';
    else if (file?.type?.startsWith('image/')) document.getElementById('ad-media-type').value = 'image';
    updateAdPreview();
}

async function toggleAdStatus(id, isActive) {
    try {
        const updated = await apiRequest(`/api/site-ads/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ is_active: Boolean(isActive) }) });
        cacheData('ads', (appData.ads || []).map(ad => String(ad.id) === String(id) ? dbAdToUi(updated) : ad));
        await refreshAdsAndStats();
    } catch (error) {
        alert('Reklam statusu yenilənmədi: ' + error.message);
    }
}

async function deleteAd(id) {
    if (!confirm('Reklam silinsin?')) return;
    try {
        await apiRequest(`/api/site-ads/${id}`, { method: 'DELETE' });
        cacheData('ads', (appData.ads || []).filter(ad => String(ad.id) !== String(id)));
        await refreshAdsAndStats();
    } catch (error) {
        alert('Reklam silinmədi: ' + error.message);
    }
}

function getAdminAdOrderFromDom() {
    return Array.from(document.querySelectorAll('#admin-ads-list .admin-ad-card')).map(card => String(card.dataset.adId || '')).filter(Boolean);
}


async function moveAd(id, direction) {
    const ads = adminAdOrder();
    const index = ads.findIndex(ad => String(ad.id) === String(id));
    const nextIndex = index + Number(direction || 0);
    if (index < 0 || nextIndex < 0 || nextIndex >= ads.length) return;
    const reordered = ads.slice();
    const [item] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, item);
    cacheData('ads', reordered.map((ad, orderIndex) => ({ ...ad, displayOrder: orderIndex + 1, rotationOrder: orderIndex + 1 })));
    renderAdminAds();
    await persistAdOrderFromDom();
}

async function persistAdOrderFromDom() {
    const ids = getAdminAdOrderFromDom();
    if (!ids.length) return;
    const byId = new Map((appData.ads || []).map(ad => [String(ad.id), ad]));
    const ordered = ids.map((id, index) => ({ ...byId.get(id), displayOrder: index + 1, rotationOrder: index + 1 })).filter(Boolean);
    cacheData('ads', ordered);
    renderAdminAds();
    try {
        const response = await apiRequest('/api/site-ads/reorder', { method: 'PUT', body: JSON.stringify({ order: ordered.map((ad, index) => ({ id: Number(ad.id), displayOrder: index + 1, rotationOrder: index + 1 })) }) });
        const rows = Array.isArray(response?.items) ? response.items : [];
        if (rows.length) cacheData('ads', rows.map(dbAdToUi));
        await refreshAdsAndStats();
    } catch (error) {
        alert('Reklam sırası yadda saxlanılmadı: ' + error.message);
        await loadAdminAds({ force: true }).catch(() => {});
    }
}



Object.assign(window, { adminAdOrder, setAdFormOpen, openAdForm, closeAdForm, toggleAdForm, extractResponseItems, adminAdMediaPreview, renderAdminAdStats, renderAdminAds, loadAdminAds, adFormValue, buildAdFormData, refreshAdsAndStats, handleSaveAd, editAd, resetAdForm, updateAdPreview, handleAdMediaFileSelection, toggleAdStatus, deleteAd, getAdminAdOrderFromDom, moveAd, persistAdOrderFromDom });
