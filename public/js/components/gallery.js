(function (window) {
  'use strict';

  function normalizeJsonArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (_error) {
        return value.split(',').map(item => item.trim()).filter(Boolean);
      }
    }
    return [];
  }

  function getYouTubeVideoId(url = '') {
    const match = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return match?.[1] || '';
  }

  function getYouTubeThumbnail(url = '') {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';
  }

  function getYouTubeThumbnailFallback(url = '') {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
  }

  function getVimeoThumbnail(url = '') {
    const match = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? `https://vumbnail.com/${match[1]}.jpg` : '';
  }

  function normalizeGalleryItem(item = {}) {
    const requestedMediaType = item.mediaType || item.media_type || item.type;
    const mediaType = String(requestedMediaType || '').toLowerCase() === 'video' ? 'video' : 'image';
    const isFeatured = Boolean(item.isFeatured ?? item.is_featured);
    const videoUrl = item.videoUrl || item.video_url || item.url || '';
    const thumbnailUrl = item.thumbnailUrl || item.thumbnail_url || item.thumbnail || '';
    const imageUrl = item.imageUrl || item.image_url || '';
    const images = normalizeJsonArray(item.images || item.mediaUrls || item.media_urls);
    return {
      ...item,
      type: mediaType === 'video' ? 'video' : 'event',
      mediaType,
      media_type: mediaType,
      isFeatured,
      is_featured: isFeatured,
      videoUrl,
      video_url: videoUrl,
      thumbnailUrl,
      thumbnail_url: thumbnailUrl,
      image: imageUrl,
      imageUrl,
      image_url: imageUrl,
      images
    };
  }

  function dbGalleryToUi(g = {}) {
    const normalizedItem = normalizeGalleryItem(g || {});
    const mediaType = String(normalizedItem.mediaType || '').toLowerCase() === 'video' ? 'video' : 'image';
    const imageRows = normalizeJsonArray(g.images);
    const mediaRows = normalizeJsonArray(g.mediaUrls || g.media_urls);
    const createdAt = g.createdAt || g.created_at || new Date().toISOString();
    const thumbnailUrl = g.thumbnailUrl || g.thumbnail_url || g.thumbnail || '';
    const autoThumbnailUrl = g.autoThumbnailUrl || g.auto_thumbnail_url || '';
    const thumbnailFallbackUrl = g.thumbnailFallbackUrl || g.thumbnail_fallback_url || '';
    const imageUrl = g.imageUrl || g.image_url || g.image || '';
    const videoUrl = g.videoUrl || g.video_url || g.url || mediaRows[0] || '';
    const images = [...imageRows, ...(mediaType === 'image' ? [...mediaRows, imageUrl, thumbnailUrl] : [])]
      .map(x => String(x || '').trim())
      .filter((x, idx, all) => x && all.indexOf(x) === idx);
    const isFeatured = Boolean(normalizedItem.isFeatured ?? normalizedItem.is_featured);
    return mediaType === 'video'
      ? { ...g, id: g.id, title: g.title || '', type: 'video', mediaType: 'video', media_type: 'video', url: videoUrl, videoUrl, video_url: videoUrl, thumbnail: thumbnailUrl || autoThumbnailUrl || thumbnailFallbackUrl || imageUrl || '', thumbnailUrl, thumbnail_url: thumbnailUrl, thumbnailFallbackUrl, thumbnail_fallback_url: thumbnailFallbackUrl, autoThumbnailUrl, auto_thumbnail_url: autoThumbnailUrl, imageUrl, image_url: imageUrl, mediaUrls: mediaRows, media_urls: mediaRows, images: imageRows, desc: g.description || g.desc || '', createdAt, duration: g.duration || '', sortOrder: g.sortOrder ?? g.sort_order ?? 0, isFeatured, is_featured: isFeatured }
      : { ...g, id: g.id, title: g.title || '', type: 'event', mediaType: 'image', media_type: 'image', images, mediaUrls: mediaRows, media_urls: mediaRows, image: imageUrl, imageUrl, image_url: imageUrl, thumbnail: thumbnailUrl, thumbnailUrl, thumbnail_url: thumbnailUrl, desc: g.description || g.desc || '', createdAt, sortOrder: g.sortOrder ?? g.sort_order ?? 0, isFeatured: false, is_featured: false };
  }

  function getGalleryVideoThumbnail(item = {}) {
    return item.thumbnailUrl || item.thumbnail_url || item.thumbnail || item.autoThumbnailUrl || item.auto_thumbnail_url || item.imageUrl || item.image_url || getYouTubeThumbnail(item.url || item.videoUrl || item.video_url) || getVimeoThumbnail(item.url || item.videoUrl || item.video_url) || '';
  }

  function getGalleryVideoThumbnailFallback(item = {}) {
    const primary = getGalleryVideoThumbnail(item);
    const youtubeFallback = item.thumbnailFallbackUrl || item.thumbnail_fallback_url || getYouTubeThumbnailFallback(item.url || item.videoUrl || item.video_url);
    return youtubeFallback && youtubeFallback !== primary ? youtubeFallback : '';
  }

  function galleryVideoPlaceholderMarkup() {
    return `<div class="w-full h-full flex flex-col items-center justify-center text-white bg-gradient-to-br from-slate-950 via-slate-800 to-brand-900"><div class="w-16 h-16 rounded-full bg-white/95 text-slate-950 flex items-center justify-center text-2xl shadow-2xl"><i class="fa-solid fa-play ml-1"></i></div><span class="mt-3 text-xs font-black uppercase tracking-[0.25em] text-white/80">Video</span></div>`;
  }

  function normalizeGalleryVideoUrl(url = '') {
    const youtube = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (youtube) return `https://www.youtube.com/embed/${youtube[1]}?rel=0&modestbranding=1&origin=https://besthome.onrender.com`;
    const vimeo = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return url;
  }

  function handleGalleryThumbnailError(img) {
    const fallback = img?.dataset?.fallbackSrc || '';
    if (fallback && img.src !== fallback) {
      img.src = fallback;
      img.removeAttribute('data-fallback-src');
      return;
    }
    const shell = img?.closest('.media-shell');
    if (shell) {
      shell.classList.remove('media-skeleton', 'bg-gray-100');
      shell.classList.add('bg-slate-900');
      shell.innerHTML = galleryVideoPlaceholderMarkup();
    }
  }

  function markMediaLoaded(el) {
    el.classList.add('is-loaded');
    el.closest('.media-shell')?.classList.remove('media-skeleton', 'bg-gray-100');
  }


  const state = {
    currentFilter: 'all',
    pageLimit: 5000,
    pagination: { page: 1, limit: 5000, total: 0, totalPages: 1 },
    featuredVideoIndex: 0,
    lazyObserver: null,
    deps: {}
  };

  function configure(deps = {}) {
    state.deps = { ...state.deps, ...deps };
    if (Number.isFinite(Number(deps.pageLimit))) {
      state.pageLimit = Number(deps.pageLimit);
      state.pagination.limit = state.pageLimit;
    }
    return api;
  }

  function setPagination(pagination = {}) {
    state.pagination = { ...state.pagination, ...pagination };
    return state.pagination;
  }

  function getPagination() {
    return state.pagination;
  }

  function getCurrentFilter() {
    return state.currentFilter;
  }

  function getFeaturedVideoIndex() {
    return state.featuredVideoIndex;
  }

  function setFeaturedVideoIndex(index = 0) {
    state.featuredVideoIndex = Math.max(0, Number(index) || 0);
    return state.featuredVideoIndex;
  }

  function setCurrentFilter(type = 'all') {
    state.currentFilter = type || 'all';
    return state.currentFilter;
  }

  function galleryItems() {
    const ordered = state.deps.orderedGalleryItems ? state.deps.orderedGalleryItems() : [];
    return (Array.isArray(ordered) ? ordered : []).map(normalizeGalleryItem);
  }

  function featuredVideos() {
    const heroVideo = galleryItems().find(item => item.mediaType === 'video' && item.isFeatured === true);
    return heroVideo ? [heroVideo] : [];
  }

  function renderGalleryHero() {
    return renderFeaturedVideoSection(featuredVideos());
  }

  function observeGalleryMedia() {
    const nodes = document.querySelectorAll('[data-gallery-src]');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(img => { img.src = img.dataset.gallerySrc; img.removeAttribute('data-gallery-src'); });
      return;
    }
    state.lazyObserver?.disconnect();
    state.lazyObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        img.src = img.dataset.gallerySrc;
        img.removeAttribute('data-gallery-src');
        observer.unobserve(img);
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    nodes.forEach(img => state.lazyObserver.observe(img));
  }

  function renderPortfolioPagination() {
    const escapeHtml = state.deps.escapeHtml || (value => String(value ?? ''));
    const container = document.getElementById('portfolio-pagination');
    if (!container) return;
    const { page, totalPages } = state.pagination;
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }
    const buttons = [];
    buttons.push(`<button onclick="loadGalleryPage(${Math.max(1, page - 1)})" ${page <= 1 ? 'disabled' : ''} class="px-4 py-2 rounded-xl text-sm font-bold border ${page <= 1 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-200 hover:bg-brand-50'}">Previous</button>`);
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(`<button onclick="loadGalleryPage(${i})" class="w-10 h-10 rounded-xl text-sm font-extrabold transition ${i === page ? 'bg-brand-500 text-white shadow-lg' : 'bg-white text-gray-700 border border-gray-200 hover:bg-brand-50'}">${escapeHtml(i)}</button>`);
    }
    buttons.push(`<button onclick="loadGalleryPage(${Math.min(totalPages, page + 1)})" ${page >= totalPages ? 'disabled' : ''} class="px-4 py-2 rounded-xl text-sm font-bold border ${page >= totalPages ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-200 hover:bg-brand-50'}">Next</button>`);
    container.innerHTML = buttons.join('');
  }

  function renderFeaturedVideoSection(videos = []) {
    const escapeHtml = state.deps.escapeHtml || (value => String(value ?? ''));
    const section = document.getElementById('featured-video-section');
    if (!section) return false;
    if (!videos.length) { section.innerHTML = ''; return false; }
    state.featuredVideoIndex = Math.max(0, Math.min(state.featuredVideoIndex, videos.length - 1));
    const featuredVideo = videos[state.featuredVideoIndex];
    const thumb = getGalleryVideoThumbnail(featuredVideo);
    const fallbackThumb = getGalleryVideoThumbnailFallback(featuredVideo);
    const thumbnailMarkup = thumb ? `<img data-gallery-src="${escapeHtml(thumb)}" ${fallbackThumb ? `data-fallback-src="${escapeHtml(fallbackThumb)}"` : ''} alt="${escapeHtml(featuredVideo.title || 'Video')}" loading="eager" decoding="async" onload="markMediaLoaded(this)" onerror="handleGalleryThumbnailError(this)" class="gallery-media gallery-media-cover w-full h-full transition duration-500">` : `<div class="w-full h-full flex flex-col items-center justify-center text-white bg-gradient-to-br from-slate-950 via-slate-800 to-brand-900"><div class="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/95 text-slate-950 flex items-center justify-center text-2xl md:text-3xl shadow-2xl"><i class="fa-solid fa-play ml-1"></i></div><span class="mt-4 text-xs md:text-sm font-black uppercase tracking-[0.3em] text-white/75">Video</span></div>`;
    section.innerHTML = `<div class="featured-video-section-inner"><article onclick="openFeaturedVideoModal(${state.featuredVideoIndex})" class="featured-video-card group cursor-pointer"><div class="featured-video-thumb media-shell ${thumb ? 'bg-gray-100 media-skeleton' : 'bg-slate-900'} relative">${thumbnailMarkup}<div class="featured-video-overlay absolute inset-0"></div>${thumb ? `<div class="featured-video-play absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/95 text-slate-950 flex items-center justify-center text-2xl md:text-3xl transition duration-300"><i class="fa-solid fa-play ml-1"></i></div>` : ''}<div class="absolute inset-x-0 bottom-0 p-4 md:p-5"><h3 class="text-base md:text-lg font-black text-white leading-snug drop-shadow-lg">${escapeHtml(featuredVideo.title || 'Video')}</h3></div></div></article></div>`;
    return true;
  }

  function changeFeaturedVideo(dir) {
    const videos = featuredVideos();
    if (!videos.length) return;
    state.featuredVideoIndex = (state.featuredVideoIndex + dir + videos.length) % videos.length;
    renderFeaturedVideoSection(videos);
    observeGalleryMedia();
  }

  function filterPortfolio(type) {
    state.currentFilter = type;
    document.querySelectorAll('.portfolio-filter-btn').forEach(btn => {
      btn.className = 'portfolio-filter-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-400 hover:text-white transition duration-200';
    });
    const activeBtn = document.getElementById('filter-' + type);
    if (activeBtn) activeBtn.className = 'portfolio-filter-btn px-4 py-2 rounded-lg text-sm font-semibold bg-brand-700 text-white';
    renderPortfolio();
  }

  async function loadGalleryPage(page = 1) {
    const deps = state.deps;
    deps.setGalleryLoading?.(true, '');
    renderPortfolio();
    if (deps.isTabAktiv?.('admin-dashboard')) deps.renderAdminGallery?.();
    try {
      const response = await deps.apiRequest(`/api/gallery?page=${page}&limit=${state.pageLimit}`);
      const payload = Array.isArray(response) ? { items: response } : (response || {});
      const records = deps.extractResponseItems(payload, ['items', 'gallery']);
      state.pagination = { page: payload.page || payload.data?.page || page, limit: payload.limit || payload.data?.limit || state.pageLimit, total: payload.total || payload.data?.total || records.length, totalPages: payload.totalPages || payload.data?.totalPages || 1 };
      deps.setGalleryItems?.(records.map(dbGalleryToUi));
    } catch (error) {
      deps.setGalleryLoading?.(true, 'Məlumat yüklənmədi. Yenidən cəhd edin.');
      console.warn('Qalereya səhifəsi API-dən yüklənmədi:', error.message);
    } finally {
      deps.setGalleryLoading?.(false);
      deps.setGalleryLoaded?.(true);
    }
    renderPortfolio();
    if (deps.isTabAktiv?.('admin-dashboard')) deps.renderAdminGallery?.();
  }

  async function loadGallery() {
    await loadGalleryPage(state.pagination.page || 1);
  }

  function renderPortfolio() {
    const deps = state.deps;
    const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
    const list = deps.orderedGalleryItems ? deps.orderedGalleryItems() : [];
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (deps.isGalleryLoading?.()) {
      const section = document.getElementById('featured-video-section');
      if (section) section.innerHTML = '';
      grid.innerHTML = deps.renderCardSkeletons ? deps.renderCardSkeletons(6) : '';
      const countEl = document.getElementById('gallery-items-count');
      if (countEl) countEl.textContent = '';
      renderPortfolioPagination();
      return;
    }
    try { renderGalleryHero(); } catch (error) {
      console.error('[gallery hero] hero render result', { rendered: false, error: error.message });
      const section = document.getElementById('featured-video-section');
      if (section) section.innerHTML = '';
    }
    const filtered = list.filter(item => state.currentFilter === 'all' || item.type === state.currentFilter);
    const countEl = document.getElementById('gallery-items-count');
    if (countEl) countEl.textContent = filtered.length ? `${filtered.length} element` : '';
    if (filtered.length === 0) {
      grid.innerHTML = deps.emptyDataState ? deps.emptyDataState() : '';
      renderPortfolioPagination();
      observeGalleryMedia();
      return;
    }
    filtered.forEach((item) => {
      const itemIndex = list.findIndex(x => String(x.id) === String(item.id));
      if (item.type === 'event') {
        const thumb = item.images && item.images.length > 0 ? item.images[0] : 'https://placehold.co/600x400/f3f4f6/6b7280?text=Photo';
        grid.insertAdjacentHTML('beforeend', `<article onclick="openGalleryDetailModal(${itemIndex}, true)" class="media-card cursor-pointer group relative rounded-[18px] overflow-hidden"><div class="gallery-card-media media-shell w-full media-skeleton overflow-hidden"><img data-gallery-src="${escapeHtml(thumb)}" width="600" height="338" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" onload="markMediaLoaded(this)" class="gallery-media w-full h-full transition duration-500"></div></article>`);
      } else {
        const thumb = getGalleryVideoThumbnail(item);
        const fallbackThumb = getGalleryVideoThumbnailFallback(item);
        grid.insertAdjacentHTML('beforeend', `<article onclick="openGalleryDetailModal(${itemIndex}, true)" class="media-card cursor-pointer group relative rounded-[18px] overflow-hidden"><div class="gallery-card-media media-shell w-full media-skeleton overflow-hidden relative">${thumb ? `<img data-gallery-src="${escapeHtml(thumb)}" ${fallbackThumb ? `data-fallback-src="${escapeHtml(fallbackThumb)}"` : ''} width="600" height="338" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" onload="markMediaLoaded(this)" onerror="handleGalleryThumbnailError(this)" class="gallery-media gallery-media-cover w-full h-full transition duration-500">` : galleryVideoPlaceholderMarkup()}</div><div class="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-90"></div><div class="absolute top-3 left-3 md:top-4 md:left-4 w-10 h-10 rounded-full bg-white/90 text-slate-950 flex items-center justify-center shadow-lg"><i class="fa-solid fa-play ml-0.5"></i></div>${item.duration ? `<div class="absolute top-3 right-3 md:top-4 md:right-4 bg-black/55 text-white rounded-full px-2.5 py-1 text-xs font-bold">${escapeHtml(item.duration)}</div>` : ''}</article>`);
      }
    });
    renderPortfolioPagination();
    observeGalleryMedia();
  }


  const api = {
    normalizeJsonArray,
    normalizeGalleryItem,
    dbGalleryToUi,
    getYouTubeVideoId,
    getYouTubeThumbnail,
    getYouTubeThumbnailFallback,
    getVimeoThumbnail,
    getGalleryVideoThumbnail,
    getGalleryVideoThumbnailFallback,
    galleryVideoPlaceholderMarkup,
    normalizeGalleryVideoUrl,
    handleGalleryThumbnailError,
    markMediaLoaded,
    configure,
    setPagination,
    getPagination,
    getCurrentFilter,
    setCurrentFilter,
    getFeaturedVideoIndex,
    setFeaturedVideoIndex,
    galleryItems,
    featuredVideos,
    renderGalleryHero,
    observeGalleryMedia,
    renderPortfolioPagination,
    renderFeaturedVideoSection,
    changeFeaturedVideo,
    filterPortfolio,
    loadGalleryPage,
    loadGallery,
    renderPortfolio
  };

  window.BestHomeGallery = api;
  window.handleGalleryThumbnailError = api.handleGalleryThumbnailError;
  window.markMediaLoaded = api.markMediaLoaded;
  window.filterPortfolio = api.filterPortfolio;
  window.loadGalleryPage = api.loadGalleryPage;
  window.loadGallery = api.loadGallery;
  window.renderPortfolio = api.renderPortfolio;
  window.renderGalleryHero = api.renderGalleryHero;
  window.changeFeaturedVideo = api.changeFeaturedVideo;
})(window);
