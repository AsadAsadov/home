function adIsWithinDates(ad) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (ad.startDate) {
        const start = new Date(ad.startDate);
        start.setHours(0, 0, 0, 0);
        if (start > today) return false;
    }
    if (ad.endDate) {
        const end = new Date(ad.endDate);
        end.setHours(23, 59, 59, 999);
        if (end < new Date()) return false;
    }
    return true;
}

function visibleRotationAds() {
    return (appData.ads || [])
        .filter(ad => ad.isActive && ['left', 'right', 'both'].includes(ad.position) && adIsWithinDates(ad))
        .sort((a, b) => (a.rotationOrder - b.rotationOrder) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || Number(a.id) - Number(b.id));
}

function getAdSignature(ads = []) {
    return ads.map(ad => [ad.id, ad.rotationOrder, ad.repeatCount, ad.displayDuration, ad.mediaType, ad.position, ad.widthPx, ad.heightPx, ad.objectFit].join(':')).join('|');
}

function clearAdRotationTimer() {
    ['timer', 'safetyTimer', 'stallTimer', 'durationTimer', 'recoveryTimer', 'stuckTimer'].forEach(key => {
        if (adRotationState[key]) {
            clearTimeout(adRotationState[key]);
            adRotationState[key] = null;
        }
    });
    (adRotationState.videoCleanups || []).forEach(cleanup => {
        try { cleanup(); } catch (_error) {}
    });
    adRotationState.videoCleanups = [];
}

function resetAdRotationRenderState() {
    clearAdRotationTimer();
    adRotationState.renderedAdId = null;
    adRotationState.activeAdId = null;
}

function finishAdRotationRepeat(expectedAdId = null) {
    const ads = visibleRotationAds();
    if (!ads.length) return renderDesktopAds({ force: true });
    const currentIndex = ads.findIndex(ad => String(ad.id) === String(expectedAdId ?? adRotationState.activeAdId));
    if (currentIndex >= 0) adRotationState.index = currentIndex;
    const currentAd = ads[adRotationState.index] || ads[0];
    const repeatCount = currentAd?.mediaType === 'video' ? 1 : adDimension(currentAd.repeatCount, AD_DEFAULT_REPEAT_COUNT, AD_MIN_REPEAT_COUNT, AD_MAX_REPEAT_COUNT);
    adRotationState.repeat += 1;
    if (adRotationState.repeat >= repeatCount) {
        adRotationState.index = (adRotationState.index + 1) % ads.length;
        adRotationState.repeat = 0;
    }
    adRotationState.timer = null;
    renderDesktopAds({ force: true });
}

async function trackAdView(ad) {
    const sessionKey = `besthome_ad_viewed_${ad.id}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    try { await apiRequest(`/api/site-ads/${ad.id}/view`, { method: 'POST' }); } catch (_error) {}
}

async function handleAdClick(id, clickUrl) {
    try { await apiRequest(`/api/site-ads/${id}/click`, { method: 'POST' }); } catch (_error) {}
    if (clickUrl) window.open(clickUrl, '_blank', 'noopener,noreferrer');
}

function clearDesktopAdRail(rail) {
    rail.querySelectorAll('video').forEach(video => {
        video.pause();
        video.removeAttribute('src');
        video.load?.();
    });
    rail.replaceChildren();
}


function applyDesktopAdDimensions(element, ad) {
    if (!element || !ad) return;
    const dimensions = getAdDimensions(ad);
    element.style.setProperty('--ad-width', `${dimensions.width}px`);
    element.style.setProperty('--ad-height', `${dimensions.height}px`);
}

function applyDesktopAdLayoutDimensions(rail, ad) {
    applyDesktopAdDimensions(rail, ad);
    const layout = rail.closest('.desktop-ad-layout, .page-with-ads');
    applyDesktopAdDimensions(layout, ad);
}

function createDesktopAdLayer(ad, visible = false, mediaNode = null, options = {}) {
    const layer = document.createElement('div');
    layer.className = `desktop-ad-layer${visible ? ' is-visible' : ''}`;
    layer.dataset.adId = ad.id || '';
    layer.appendChild(mediaNode || createAdMediaNode(ad, 'desktop-ad-media', { loop: options.loop ?? false, rotation: options.rotation !== false, responsive: true, eager: true }));
    return layer;
}

function getDesktopAdRailRepeatCount(rail, ad) {
    const dimensions = getAdDimensions(ad);
    const layout = rail.closest('.desktop-ad-layout, .page-with-ads');
    const main = layout?.querySelector('main');
    const railGap = Number.parseFloat(getComputedStyle(rail).rowGap || getComputedStyle(rail).gap || '0') || 0;
    const cardHeight = dimensions.height + 32;
    const targetHeight = Math.max(layout?.scrollHeight || 0, main?.scrollHeight || 0, window.innerHeight || 0);
    return Math.max(1, Math.ceil((targetHeight + railGap) / (cardHeight + railGap)) + 1);
}

function createDesktopAdCard(ad, options = {}) {
    const card = document.createElement('article');
    card.className = 'desktop-ad-card desktop-ad-card--responsive';
    applyDesktopAdDimensions(card, ad);
    const dimensions = getAdDimensions(ad);
    card.dataset.adWidth = String(dimensions.width);
    card.dataset.adHeight = String(dimensions.height);
    card.role = 'button';
    card.tabIndex = 0;
    const stage = document.createElement('div');
    stage.className = 'desktop-ad-stage';
    applyDesktopAdDimensions(stage, ad);
    stage.appendChild(createDesktopAdLayer(ad, true, options.mediaNode || null, { rotation: !options.visualClone, loop: Boolean(options.visualClone) }));
    const label = document.createElement('div');
    label.className = 'desktop-ad-label';
    label.textContent = ad.title || '';
    if (options.visualClone) card.dataset.adVisualClone = 'true';
    card.append(stage, label);
    return card;
}

function configureDesktopAdCard(card, ad) {
    card.dataset.adId = ad.id || '';
    applyDesktopAdDimensions(card, ad);
    const stage = card.querySelector('.desktop-ad-stage');
    applyDesktopAdDimensions(stage, ad);
    card.onclick = () => handleAdClick(ad.id, ad.clickUrl || '');
    card.onkeydown = event => { if (event.key === 'Enter') handleAdClick(ad.id, ad.clickUrl || ''); };
    const label = card.querySelector('.desktop-ad-label');
    if (label) label.textContent = ad.title || '';
}

function showDesktopAdInRail(rail, ad, token, mediaNode = null) {
    applyDesktopAdLayoutDimensions(rail, ad);
    const repeatCount = getDesktopAdRailRepeatCount(rail, ad);
    const dimensions = getAdDimensions(ad);
    const existingCards = Array.from(rail.querySelectorAll('.desktop-ad-card'));
    const needsFreshStack = existingCards.length !== repeatCount || existingCards.some(card => String(card.dataset.adId) !== String(ad.id) || Number(card.dataset.adWidth) !== dimensions.width || Number(card.dataset.adHeight) !== dimensions.height);
    if (needsFreshStack) {
        const cards = Array.from({ length: repeatCount }, (_item, index) => {
            const card = createDesktopAdCard(ad, { mediaNode: index === 0 ? mediaNode : null, visualClone: index > 0 });
            configureDesktopAdCard(card, ad);
            return card;
        });
        rail.replaceChildren(...cards);
        return;
    }
    existingCards.forEach(card => configureDesktopAdCard(card, ad));
}

function attachDesktopAdVideoHandlers(ad, token) {
    if (ad.mediaType !== 'video') return;
    const videos = Array.from(document.querySelectorAll('[data-ad-rotation-video="true"]')).filter(video => String(video.dataset.adId) === String(ad.id));
    const primaryVideo = videos[0];
    const oneVideoAd = visibleRotationAds().filter(item => item.mediaType === 'video').length === 1 && visibleRotationAds().length === 1;
    let hasPlayed = false;
    let lastCurrentTime = 0;
    let lastProgressAt = Date.now();
    let skipRequested = false;
    const debugAds = localStorage.getItem('besthomeDebugAds') === 'true';
    const clearVideoTimer = key => {
        if (adRotationState[key]) {
            clearTimeout(adRotationState[key]);
            adRotationState[key] = null;
        }
    };
    const next = (delay = 0) => {
        if (oneVideoAd) {
            adRotationState.stallTimer = setTimeout(() => {
                if (token !== adRotationState.transitionToken) return;
                primaryVideo.currentTime = 0;
                primaryVideo.play().catch(() => next(1000));
            }, Math.max(delay, 1000));
            return;
        }
        adRotationState.stallTimer = setTimeout(() => finishAdRotationRepeat(ad.id), Math.max(delay, 0));
    };
    const skip = (delay = 0, warning = '[ads] video failed, skipping') => {
        if (token !== adRotationState.transitionToken || skipRequested) return;
        skipRequested = true;
        if (debugAds) console.warn(warning);
        clearVideoTimer('safetyTimer');
        clearVideoTimer('recoveryTimer');
        clearVideoTimer('stuckTimer');
        clearVideoTimer('durationTimer');
        next(delay);
    };
    const cleanupTimers = () => {
        clearVideoTimer('safetyTimer');
        clearVideoTimer('recoveryTimer');
        clearVideoTimer('stuckTimer');
        clearVideoTimer('durationTimer');
    };
    const scheduleStuckCheck = () => {
        clearVideoTimer('stuckTimer');
        adRotationState.stuckTimer = setTimeout(() => {
            if (token !== adRotationState.transitionToken || skipRequested || !primaryVideo || primaryVideo.paused || primaryVideo.ended) return;
            const current = Number(primaryVideo.currentTime || 0);
            if (hasPlayed && current > lastCurrentTime + 0.05) {
                lastCurrentTime = current;
                lastProgressAt = Date.now();
            }
            if (hasPlayed && Date.now() - lastProgressAt >= 10000) return skip(0, '[ads] video currentTime stuck for 10s, skipping');
            scheduleStuckCheck();
        }, 1000);
    };
    if (!primaryVideo) return skip(0);
    adRotationState.safetyTimer = setTimeout(() => {
        if (!hasPlayed) skip(0, '[ads] video did not start playing within 12s, skipping');
    }, 12000);
    videos.forEach((video, index) => {
        const onMetadata = () => { if (debugAds && index === 0) console.info('[ads] video metadata loaded'); };
        const onCanPlay = () => { if (debugAds && index === 0) console.info('[ads] video canplay'); };
        const onPlaying = () => {
            if (index !== 0) return;
            hasPlayed = true;
            lastCurrentTime = Number(video.currentTime || 0);
            lastProgressAt = Date.now();
            clearVideoTimer('safetyTimer');
            clearVideoTimer('recoveryTimer');
            scheduleStuckCheck();
        };
        const onTimeUpdate = () => {
            if (index !== 0) return;
            const current = Number(video.currentTime || 0);
            if (current > lastCurrentTime + 0.05) lastProgressAt = Date.now();
            lastCurrentTime = current;
        };
        const onEnded = () => {
            if (index !== 0) return;
            cleanupTimers();
            if (oneVideoAd) {
                video.currentTime = 0;
                video.play().catch(() => skip(1000));
            } else {
                finishAdRotationRepeat(ad.id);
            }
        };
        const onFatalProblem = () => skip(0, '[ads] video fatal media event, skipping');
        const onRecoverableBuffering = () => {
            if (index !== 0 || !hasPlayed) return;
            scheduleStuckCheck();
        };
        const events = [['loadedmetadata', onMetadata], ['canplay', onCanPlay], ['playing', onPlaying], ['timeupdate', onTimeUpdate], ['waiting', onRecoverableBuffering], ['stalled', onRecoverableBuffering], ['ended', onEnded], ['error', onFatalProblem], ['abort', onFatalProblem], ['emptied', onFatalProblem]];
        events.forEach(([name, handler]) => video.addEventListener(name, handler));
        adRotationState.videoCleanups.push(() => events.forEach(([name, handler]) => video.removeEventListener(name, handler)));
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.loop = false;
        video.preload = 'auto';
        video.currentTime = 0;
        video.play().catch(() => skip(0, '[ads] video play() rejected, skipping'));
    });
}

function preloadAdMediaNode(ad) {
    return new Promise((resolve, reject) => {
        const node = createAdMediaNode(ad, 'desktop-ad-media', { loop: false, rotation: true, responsive: true, eager: true });
        if (ad.mediaType !== 'video') {
            const img = node.tagName === 'IMG' ? node : node.querySelector?.('img');
            if (!img) return resolve(node);
            if (img.complete && img.naturalWidth > 0) return resolve(node);
            img.onload = () => { loadedAdImages.add(ad.mediaUrl || ''); resolve(node); };
            img.onerror = () => reject(new Error('Ad image failed to load'));
            return;
        }
        const video = node.tagName === 'VIDEO' ? node : node.querySelector?.('video');
        if (!video) return resolve(node);
        let done = false;
        const finish = () => { if (done) return; done = true; cleanup(); resolve(node); };
        const fail = () => { if (done) return; done = true; cleanup(); reject(new Error('Ad video failed to load')); };
        const cleanup = () => {
            clearTimeout(timeout);
            video.removeEventListener('loadedmetadata', finish);
            video.removeEventListener('canplay', finish);
            video.removeEventListener('error', fail);
        };
        const timeout = setTimeout(finish, 3000);
        video.addEventListener('loadedmetadata', finish, { once: true });
        video.addEventListener('canplay', finish, { once: true });
        video.addEventListener('error', fail, { once: true });
        video.load?.();
    });
}

async function renderDesktopAds(options = {}) {
    const left = document.getElementById('desktop-left-ads');
    const right = document.getElementById('desktop-right-ads');
    if (!left || !right) return;
    if (window.innerWidth < AD_DESKTOP_MIN_WIDTH) {
        clearDesktopAdRail(left);
        clearDesktopAdRail(right);
        left.classList.remove('is-loading');
        right.classList.remove('is-loading');
        resetAdRotationRenderState();
        return;
    }
    const ads = visibleRotationAds();
    if (!ads.length) {
        clearDesktopAdRail(left);
        clearDesktopAdRail(right);
        left.classList.remove('is-loading');
        right.classList.remove('is-loading');
        adRotationState.index = 0;
        adRotationState.repeat = 0;
        adRotationState.activeAdsSignature = '';
        resetAdRotationRenderState();
        return;
    }
    const activeAdsSignature = getAdSignature(ads);
    if (adRotationState.activeAdsSignature !== activeAdsSignature) {
        adRotationState.activeAdsSignature = activeAdsSignature;
        const activeIndex = ads.findIndex(ad => String(ad.id) === String(adRotationState.activeAdId));
        adRotationState.index = activeIndex >= 0 ? activeIndex : 0;
        if (activeIndex < 0) adRotationState.repeat = 0;
        resetAdRotationRenderState();
    }
    if (adRotationState.index >= ads.length) adRotationState.index = 0;
    const ad = ads[adRotationState.index];
    const sameRenderedAd = String(adRotationState.renderedAdId) === String(ad.id);
    const renderedVideo = sameRenderedAd && Array.from(document.querySelectorAll('[data-ad-rotation-video="true"]')).some(video => String(video.dataset.adId) === String(ad.id));
    if (!options.force && sameRenderedAd && (adRotationState.timer || (ad.mediaType === 'video' && renderedVideo))) {
        return;
    }
    const hasRenderedAd = Boolean(adRotationState.renderedAdId);
    const token = ++adRotationState.transitionToken;
    clearAdRotationTimer();
    let preparedMediaNode = null;
    if (!sameRenderedAd && hasRenderedAd) {
        try {
            preparedMediaNode = await preloadAdMediaNode(ad);
        } catch (error) {
            console.warn('Reklam mediası yüklənmədi, cari reklam saxlanılır:', error.message);
            adRotationState.index = (adRotationState.index + 1) % ads.length;
            adRotationState.timer = setTimeout(() => renderDesktopAds({ force: true }), 1000);
            return;
        }
        if (token !== adRotationState.transitionToken) return;
    }
    if (String(adRotationState.activeAdId) !== String(ad.id)) {
        adRotationState.activeAdId = ad.id;
        adRotationState.repeat = 0;
    }
    trackAdView(ad);
    left.classList.remove('is-loading');
    right.classList.remove('is-loading');
    applyDesktopAdLayoutDimensions(left, ad);
    applyDesktopAdLayoutDimensions(right, ad);
    if (ad.position === 'left' || ad.position === 'both') showDesktopAdInRail(left, ad, token, preparedMediaNode);
    else clearDesktopAdRail(left);
    if (ad.position === 'right' || ad.position === 'both') showDesktopAdInRail(right, ad, token, preparedMediaNode ? preparedMediaNode.cloneNode(true) : null);
    else clearDesktopAdRail(right);
    adRotationState.renderedAdId = ad.id;
    attachDesktopAdVideoHandlers(ad, token);
    if (ad.mediaType !== 'video') {
        loadedAdImages.add(ad.mediaUrl || '');
        preloadNextAdImage(ads, adRotationState.index);
        const durationSeconds = adDimension(ad.displayDuration, AD_DEFAULT_DISPLAY_DURATION_SECONDS, AD_MIN_DISPLAY_DURATION_SECONDS, AD_MAX_DISPLAY_DURATION_SECONDS);
        adRotationState.timer = setTimeout(() => finishAdRotationRepeat(ad.id), durationSeconds * 1000);
    }
}


function preloadNextAdImage(ads = [], activeIndex = 0) {
    if (ads.length <= 1) return;
    const nextAd = ads[(activeIndex + 1) % ads.length];
    if (!nextAd || nextAd.mediaType === 'video') return;
    preloadCachedImage(nextAd.mediaUrl, loadedAdImages);
}

async function loadAdsBackground(options = {}) {
    if (homepageHydration.ads) return;
    const shouldRender = options.render !== false;
    homepageHydration.ads = true;
    try {
        const [ads, adStats] = await Promise.all([
            apiRequest('/api/site-ads').catch(error => {
                return appData.ads || [];
            }),
            isAdminRole(activeUser?.role) ? apiRequest('/api/site-ads/stats').catch(() => null) : Promise.resolve(null)
        ]);
        cacheData('ads', (ads || []).map(dbAdToUi));
        appData.adStats = adStats;
    } catch (error) {
        if (localStorage.getItem('besthomeDebugAds') === 'true') console.warn('Reklamlar oxunmadı, cache istifadə olunur:', error.message);
    } finally {
        if (shouldRender || (homepageHydration.initialHomepageLoaded && isTabAktiv('seabreeze'))) renderDesktopAds({ force: true });
    }
}


Object.assign(window, { adIsWithinDates, visibleRotationAds, getAdSignature, clearAdRotationTimer, resetAdRotationRenderState, finishAdRotationRepeat, trackAdView, handleAdClick, clearDesktopAdRail, applyDesktopAdDimensions, applyDesktopAdLayoutDimensions, createDesktopAdLayer, getDesktopAdRailRepeatCount, createDesktopAdCard, configureDesktopAdCard, showDesktopAdInRail, attachDesktopAdVideoHandlers, preloadAdMediaNode, renderDesktopAds, preloadNextAdImage, loadAdsBackground });
