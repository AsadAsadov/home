(function () {
    'use strict';

function openListingModal(listingId) {
    return openPropertyModal(String(listingId), false);
}
window.openListingModal = window.openListingModal || openListingModal;
window.openListingDetail = window.openListingDetail || window.openListingModal;
window.showListingDetail = window.showListingDetail || window.openListingModal;

function getListingDetailModalOpener() {
    return [window.openListingModal, window.openListingDetail, window.showListingDetail]
        .find(fn => typeof fn === 'function');
}

function isListingCardInteractiveClick(target) {
    if (!(target instanceof Element)) return true;
    return Boolean(target.closest([
        'button',
        'a',
        'input',
        'select',
        'textarea',
        'label',
        '[role="button"]',
        '.favorite-btn',
        '.share-btn',
        '.heart-btn',
        '.listing-action-btn',
        '.admin-action-btn',
        '.admin-listing-action',
        '.listing-card-action',
        '.listing-card-actions',
        '[data-favorite-btn]',
        '[data-share-btn]',
        '[data-phone-btn]',
        '[data-whatsapp-btn]'
    ].join(',')));
}

function handleDelegatedListingCardClick(event) {
    if (event.defaultPrevented || isListingCardInteractiveClick(event.target)) return;
    const card = event.target instanceof Element ? event.target.closest('[data-listing-id]') : null;
    if (!card) return;
    const listingId = card.dataset?.listingId || card.getAttribute('data-listing-id');
    if (!listingId) return;
    const openDetailModal = getListingDetailModalOpener();
    if (openDetailModal) openDetailModal(String(listingId));
}

document.addEventListener('click', handleDelegatedListingCardClick);

// OPEN PROPERTY DETAILS MODAL (WITH PREMIUM GALLERY + WHATSAPP ŞABLON)
window.activePropertyImages = window.activePropertyImages || [];
window.activePropertyImageIndex = window.activePropertyImageIndex || 0;
window.activePropertyListing = window.activePropertyListing || null;

function updatePropertyMainCarouselControls() {
    const hasMany = window.activePropertyImages.length > 1;
    document.getElementById('p-modal-prev-image')?.classList.toggle('hidden', !hasMany);
    document.getElementById('p-modal-next-image')?.classList.toggle('hidden', !hasMany);
}

function setPropertyMainImage(index) {
    if (!window.activePropertyImages.length) return;
    window.activePropertyImageIndex = (index + window.activePropertyImages.length) % window.activePropertyImages.length;
    updatePropertyMainCarouselControls();
    const image = document.getElementById('p-modal-img');
    const imageFrame = image.closest('.listing-detail-main-image');
    const selectedUrl = window.activePropertyImages[window.activePropertyImageIndex];
    image.classList.add('is-switching');
    imageFrame?.classList.add('is-switching');
    const finishSwitch = () => {
        image.classList.remove('is-switching');
        imageFrame?.classList.remove('is-switching');
    };
    image.onload = finishSwitch;
    window.setTimeout(finishSwitch, 280);
    image.src = selectedUrl;
    image.onclick = () => openPropertyLightbox(window.activePropertyImageIndex);
    document.getElementById('p-modal-image-counter').textContent = `${window.activePropertyImageIndex + 1} / ${window.activePropertyImages.length}`;
    document.querySelectorAll('.listing-detail-thumbnail').forEach((btn, idx) => {
        const active = idx === window.activePropertyImageIndex;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-current', active ? 'true' : 'false');
        if (active) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
}

function changePropertyMainImage(direction) {
    if (window.activePropertyImages.length <= 1) return;
    setPropertyMainImage(window.activePropertyImageIndex + direction);
}

function renderPropertyThumbnails(images) {
    const container = document.getElementById('p-modal-thumbnails');
    container.innerHTML = '';
    images.forEach((url, index) => {
        container.insertAdjacentHTML('beforeend', `
            <button type="button" onclick="openPropertyLightbox(${index})" class="listing-detail-thumbnail ${index === 0 ? 'is-active' : ''}" aria-label="${index + 1}-ci elan şəklini qalereyada aç" aria-current="${index === 0 ? 'true' : 'false'}">
                <img src="${escapeHtml(url)}" width="960" height="720" loading="lazy" decoding="async" alt="Elan şəkli ${index + 1}">
            </button>
        `);
    });
}

function isPropertyLightboxOpen() {
    const modal = document.getElementById('property-lightbox');
    return Boolean(modal && !modal.classList.contains('hidden'));
}

function applyPropertyLightboxImageFit(img) {
    if (!img?.naturalWidth || !img?.naturalHeight) return;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720;
    const maxWidth = viewportWidth * (viewportWidth < 768 ? 1 : 0.95);
    const maxHeight = viewportHeight * 0.9;
    const containScale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
    const upscaleLimit = Math.min(containScale, 1.45);
    const scale = containScale > 1 ? upscaleLimit : containScale;
    const fittedWidth = Math.max(1, Math.round(img.naturalWidth * scale));
    const fittedHeight = Math.max(1, Math.round(img.naturalHeight * scale));

    img.style.setProperty('--fit-width', `${fittedWidth}px`);
    img.style.setProperty('--fit-height', `${fittedHeight}px`);
}

function resetPropertyLightboxImageFit(img) {
    if (!img) return;
    img.style.removeProperty('--fit-width');
    img.style.removeProperty('--fit-height');
}

function setPropertyLightboxImage(index) {
    if (!window.activePropertyImages.length) return;
    window.activePropertyImageIndex = (index + window.activePropertyImages.length) % window.activePropertyImages.length;
    const selectedUrl = window.activePropertyImages[window.activePropertyImageIndex];
    const lightboxImg = document.getElementById('property-lightbox-img');
    const counter = document.getElementById('property-lightbox-counter');
    const title = document.getElementById('property-lightbox-title');

    if (title) title.textContent = document.getElementById('p-modal-title')?.textContent || 'Elan şəkilləri';
    if (counter) counter.textContent = `${window.activePropertyImageIndex + 1} / ${window.activePropertyImages.length}`;
    if (lightboxImg) {
        lightboxImg.classList.remove('is-loaded');
        resetPropertyLightboxImageFit(lightboxImg);
        lightboxImg.onload = () => {
            applyPropertyLightboxImageFit(lightboxImg);
            lightboxImg.classList.add('is-loaded');
        };
        lightboxImg.onerror = () => {
            resetPropertyLightboxImageFit(lightboxImg);
            lightboxImg.classList.add('is-loaded');
        };
        lightboxImg.src = selectedUrl;
        lightboxImg.alt = `${title?.textContent || 'Elan şəkli'} - ${window.activePropertyImageIndex + 1}`;
        if (lightboxImg.complete && lightboxImg.naturalWidth) lightboxImg.onload();
    }

    document.querySelectorAll('#property-lightbox .property-lightbox__thumb').forEach((btn, idx) => {
        const active = idx === window.activePropertyImageIndex;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-current', active ? 'true' : 'false');
        if (active) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
    setPropertyMainImage(window.activePropertyImageIndex);
}

function renderPropertyLightboxThumbnails() {
    const strip = document.getElementById('property-lightbox-thumbnails');
    if (!strip) return;
    strip.innerHTML = window.activePropertyImages.map((url, index) => `
        <button type="button" onclick="setPropertyLightboxImage(${index})" class="property-lightbox__thumb ${index === window.activePropertyImageIndex ? 'is-active' : ''}" aria-label="${index + 1}-ci şəkli aç" aria-current="${index === window.activePropertyImageIndex ? 'true' : 'false'}">
            <img src="${escapeHtml(url)}" width="160" height="120" loading="lazy" decoding="async" alt="Elan miniaturu ${index + 1}">
        </button>
    `).join('');
}

function updatePropertyLightboxControls() {
    const hasMany = window.activePropertyImages.length > 1;
    ['property-lightbox-prev', 'property-lightbox-next'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('hidden', !hasMany);
    });
    document.getElementById('property-lightbox-thumbnails')?.classList.toggle('hidden', window.activePropertyImages.length <= 1);
}

function openPropertyLightbox(index = 0) {
    if (!window.activePropertyImages.length) return;
    window.activePropertyImageIndex = Math.max(0, Math.min(index, window.activePropertyImages.length - 1));
    renderPropertyLightboxThumbnails();
    updatePropertyLightboxControls();
    const modal = document.getElementById('property-lightbox');
    modal?.classList.remove('is-closing', 'hidden');
    setModalOpenState(true);
    setPropertyLightboxImage(window.activePropertyImageIndex);
    window.setTimeout(() => applyPropertyLightboxImageFit(document.getElementById('property-lightbox-img')), 0);
}

function resetPropertyLightboxElement() {
    const lightboxImg = document.getElementById('property-lightbox-img');
    if (lightboxImg) {
        lightboxImg.removeAttribute('src');
        resetPropertyLightboxImageFit(lightboxImg);
        lightboxImg.classList.remove('is-loaded');
    }
}

function closePropertyLightbox({ immediate = false } = {}) {
    const modal = document.getElementById('property-lightbox');
    if (!modal || modal.classList.contains('hidden')) return;
    if (immediate) {
        modal.classList.add('hidden');
        modal.classList.remove('is-closing');
        resetPropertyLightboxElement();
        syncModalOpenState();
        return;
    }
    modal.classList.add('is-closing');
    window.setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('is-closing');
        resetPropertyLightboxElement();
        syncModalOpenState();
    }, 200);
}

function changePropertyLightboxImage(dir) {
    if (!window.activePropertyImages.length) return;
    setPropertyLightboxImage(window.activePropertyImageIndex + dir);
}

async function shareListing(p) {
    const shareUrl = absoluteUrl(listingPath(p));
    const shareData = { title: p.title, text: `${p.title} - ${formatPrice(p.price, p.currency)}`, url: shareUrl };
    if (navigator.share) {
        await navigator.share(shareData).catch(() => {});
        return;
    }
    await navigator.clipboard?.writeText(shareUrl).catch(() => {});
    alert('Elan linki kopyalandı.');
}

function findListingByIdentifier(identifier) {
    const idText = String(identifier ?? '');
    return (window.appData.listings || []).find(item =>
        String(item.id ?? '') === idText ||
        String(item.listingCode ?? item.listing_code ?? item.code ?? '') === idText
    ) || null;
}

async function fetchListingDetail(identifier) {
    const encodedId = encodeURIComponent(String(identifier ?? ''));
    if (!encodedId) return null;
    try {
        return dbListingToUi(await apiRequest(`/api/listings/code/${encodedId}`));
    } catch (codeError) {
        try {
            return dbListingToUi(await apiRequest(`/api/listings/${encodedId}`));
        } catch (idError) {
            console.warn('Elan detalları API-dən oxunmadı:', idError.message || codeError.message);
            return null;
        }
    }
}

async function openPropertyModal(id, pushRoute = false) {
    try {
        let p = findListingByIdentifier(id);
        if (!p) {
            p = await fetchListingDetail(id);
            if (p) upsertCachedItem('listings', p);
        }
        if (!p) {
            showToast('Elan məlumatları tapılmadı. Zəhmət olmasa yenidən cəhd edin.');
            return;
        }
        if (getAuthToken() && !window.homepageHydration.favorites) await loadFavoritesLazy();

        const fallbackImage = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80';
        const listingTitle = p.title || p.name || p.heading || 'Elan';
        const listingPrice = Number(p.price);
        const listingLocation = getListingLocationLabel(p) || p.locationLabel || p.project || p.city || '';
        const listingImages = Array.isArray(p.images) && p.images.length ? p.images : [p.img || fallbackImage].filter(Boolean);
        const listingDescription = p.desc || p.description || p.details || '';
        const listingCode = p.listingCode || p.listing_code || p.code || p.id || '';
        const listingOwner = p.user || window.appData.agents.find(a => String(a.id) === String(p.authorId || p.ownerId)) || null;
        const listingPhone = listingOwner?.phone || p.ownerPhone || p.agentPhone || '';

        window.activePropertyListing = p;

        if (pushRoute) history.pushState({ route: 'listing', id: p.id }, '', listingPath(p));
        updateSeo({ title: listingSeoTitle(p), description: listingSeoDescription(p), path: listingPath(p), image: p.img, type: 'article' });

        window.activePropertyImages = listingImages.length ? listingImages : [fallbackImage];
        window.activePropertyImageIndex = 0;
        renderPropertyThumbnails(window.activePropertyImages);
        setPropertyMainImage(0);

        const listingLabel = listingTypeLabel(p.listingType);
        const isRent = canonicalListingType(p.listingType) === 'Kiraye';
        const isDailyRent = canonicalListingType(p.listingType) === 'GunlukKiraye';
        const categoryLabel = [...window.SEA_BREEZE_CATEGORIES, ...window.GENERAL_CATEGORIES].find(item => item.value === p.category)?.label || (p.category === 'Land' ? 'Torpaq' : 'Mənzil');
        const area = Number(p.area);
        const pricePerM2 = Number(p.pricePerM2 || (area && listingPrice ? listingPrice / area : 0));

        const typeBadge = document.getElementById('p-modal-type');
        typeBadge.textContent = listingLabel;
        typeBadge.className = `${listingTypeBadgeClass(p.listingType).replace('/90', '/10')} text-gray-900 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-slate-200`;
        document.getElementById('p-modal-category').textContent = categoryLabel;
        document.getElementById('p-modal-project').textContent = listingLocation;
        document.getElementById('p-modal-badges').innerHTML = renderListingBadgeStack(p, true);
        document.getElementById('p-modal-title').textContent = listingTitle;
        const codeBadgeHtml = `<span id="p-modal-code" class="location-badge location-badge--code">Elan kodu: ${escapeHtml(formatListingCode(listingCode))}</span>`;
        document.getElementById('p-modal-location-badges').innerHTML = `${renderLocationBadges(p)}${codeBadgeHtml}`;
        document.getElementById('p-modal-date').innerHTML = `<i class="fa-regular fa-calendar mr-1"></i>Paylaşılıb: ${formatAzDateTime(p.createdAt)}`;
        document.getElementById('p-modal-desc').textContent = listingDescription || 'Təsvir əlavə edilməyib.';
        document.getElementById('p-modal-price').textContent = Number.isFinite(listingPrice) ? `${formatPrice(listingPrice, p.currency)}${isRent ? ' /ay' : ''}${isDailyRent ? ' /gün' : ''}` : '—';
        document.getElementById('p-modal-rooms').textContent = p.rooms ?? '—';
        document.getElementById('p-modal-area').textContent = Number.isFinite(area) ? `${area.toLocaleString('az-AZ')} m²` : '—';
        document.getElementById('p-modal-floor').textContent = formatListingFloor(p.floorNumber ?? p.floor, p.floorCount);
        const sqPriceEl = document.getElementById('p-modal-sqprice');
        if (isSaleListing(p.listingType) && pricePerM2) {
            sqPriceEl.textContent = `1 m²: ${formatPrice(Math.round(pricePerM2), p.currency)}`;
            sqPriceEl.classList.remove('hidden');
        } else {
            sqPriceEl.textContent = '';
            sqPriceEl.classList.add('hidden');
        }

        const visibleLocationLabel = listingLocation;
        const compactStreetAddress = isListingLocationVisible(p) ? (p.streetAddress || visibleLocationLabel || '') : '';
        document.getElementById('p-modal-street-address').textContent = compactStreetAddress ? `📌 ${compactStreetAddress}` : '';
        const locationSection = document.getElementById('p-modal-location-section');
        locationSection?.classList.toggle('hidden', !compactStreetAddress && !renderLocationBadges(p));
        renderListingDetailMap(p);

        const creditPanel = document.getElementById('p-modal-credit');
        if (creditPanel) {
            creditPanel.classList.toggle('hidden', !p.isCredit);
            document.getElementById('p-modal-credit-down').textContent = formatPrice(p.creditDownPayment, p.currency);
            document.getElementById('p-modal-credit-monthly').textContent = formatPrice(p.creditMonthlyPayment, p.currency);
            document.getElementById('p-modal-credit-years').textContent = p.creditYears ? `${p.creditYears} il` : '—';
        }

        const authorName = listingOwner
            ? (listingOwner.fullname || `${listingOwner.name || ''} ${listingOwner.surname || ''}`.trim() || 'BestHome Əmlak')
            : (p.ownerName || 'BestHome Əmlak');
        const authorPhone = listingPhone;
        const normalizedPhone = normalizePhoneForLink(authorPhone);
        const phoneAvailable = Boolean(normalizedPhone);

        document.getElementById('p-modal-agent-name').textContent = authorName;
        document.getElementById('p-modal-agent-phone').textContent = authorPhone || 'Nömrə qeyd edilməyib';

        const messageText = buildWhatsAppMessage(p, authorName);
        const whatsappBtn = document.getElementById('p-modal-whatsapp-btn');
        const callBtn = document.getElementById('p-modal-call-btn');
        const updateContactAction = (btn, isAvailable, enabledClasses, disabledLabel) => {
            btn.classList.toggle('is-disabled', !isAvailable);
            btn.classList.toggle('opacity-50', !isAvailable);
            btn.classList.toggle('cursor-not-allowed', !isAvailable);
            btn.classList.toggle('shadow-none', !isAvailable);
            enabledClasses.forEach((className) => btn.classList.toggle(className, isAvailable));
            btn.setAttribute('aria-disabled', isAvailable ? 'false' : 'true');
            btn.setAttribute('aria-label', isAvailable ? btn.dataset.enabledLabel : disabledLabel);
            btn.tabIndex = isAvailable ? 0 : -1;
            if (!isAvailable) btn.removeAttribute('href');
        };
        whatsappBtn.dataset.enabledLabel = 'WhatsApp ilə əlaqə saxla';
        callBtn.dataset.enabledLabel = 'Zəng et';
        updateContactAction(whatsappBtn, phoneAvailable, ['bg-green-500', 'hover:bg-green-600', 'text-white'], 'WhatsApp nömrəsi mövcud deyil');
        updateContactAction(callBtn, phoneAvailable, ['bg-blue-600', 'hover:bg-blue-700', 'text-white'], 'Zəng üçün nömrə mövcud deyil');
        if (phoneAvailable) {
            whatsappBtn.href = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(messageText)}`;
            callBtn.href = `tel:${normalizedPhone}`;
        }
        document.getElementById('p-modal-share-top-btn').onclick = () => shareListing(p);
        const messageBtn = document.getElementById('p-modal-message-btn');
        if (messageBtn) messageBtn.onclick = () => startListingConversation(p.id);
        const favoriteBtn = document.getElementById('p-modal-favorite-btn');
        if (favoriteBtn) favoriteBtn.onclick = (event) => toggleFavorite(event, p.id);
        renderFavoriteControlState(p.id);
        const previewBanner = document.getElementById('p-modal-preview-banner');
        if (previewBanner) previewBanner.classList.toggle('hidden', normalizeListingStatus(p.status) === 'approved');

        document.getElementById('property-detail-modal').classList.remove('hidden');
        setModalOpenState(true);
        if (normalizeListingStatus(p.status) === 'approved') await trackListingView(p.id || id);
    } catch (error) {
        console.error('Elan modalı açıla bilmədi:', error);
        showToast('Elan açılmadı. Zəhmət olmasa yenidən cəhd edin.');
    }
}

function closePropertyModal({ updateRoute = true, immediateLightbox = false } = {}) {
    if (isPropertyLightboxOpen()) closePropertyLightbox({ immediate: immediateLightbox });
    document.getElementById('property-detail-modal').classList.add('hidden');
    syncModalOpenState();
    if (window.detailListingMap) setTimeout(() => window.detailListingMap.invalidateSize(), 50);
    if (updateRoute && window.location.pathname.startsWith('/listing/')) {
        history.pushState({ tabId: 'seabreeze' }, '', '/');
        updateSeo({ title: window.SITE_NAME, path: '/' });
    }
}

function closeListingModalForMessageNavigation() {
    closePropertyModal({ updateRoute: false, immediateLightbox: true });
    document.getElementById('property-detail-modal')?.classList.add('hidden');
    document.getElementById('property-lightbox')?.classList.add('hidden');
    syncModalOpenState();
}


window.openListingModal = window.openListingModal || openListingModal;
window.openListingDetail = window.openListingDetail || window.openListingModal;
window.showListingDetail = window.showListingDetail || window.openListingModal;
window.closeListingModal = window.closeListingModal || closePropertyModal;
window.closePropertyModal = window.closePropertyModal || closePropertyModal;
window.changePropertyMainImage = window.changePropertyMainImage || changePropertyMainImage;
window.openPropertyLightbox = window.openPropertyLightbox || openPropertyLightbox;
window.closePropertyLightbox = window.closePropertyLightbox || closePropertyLightbox;
window.changePropertyLightboxImage = window.changePropertyLightboxImage || changePropertyLightboxImage;
window.setPropertyLightboxImage = window.setPropertyLightboxImage || setPropertyLightboxImage;
window.closeListingModalForMessageNavigation = window.closeListingModalForMessageNavigation || closeListingModalForMessageNavigation;
window.getListingDetailModalOpener = window.getListingDetailModalOpener || getListingDetailModalOpener;
window.isListingCardInteractiveClick = window.isListingCardInteractiveClick || isListingCardInteractiveClick;

})();
