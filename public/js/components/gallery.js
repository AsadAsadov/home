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

  window.BestHomeGallery = {
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
    markMediaLoaded
  };
})(window);
