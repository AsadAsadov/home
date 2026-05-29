function getYouTubeId(url = '') {
  const match = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1] || null;
}

function getVimeoId(url = '') {
  const match = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] || null;
}

function isMp4Url(url = '') {
  return /\.mp4($|[?#])/i.test(String(url));
}

const DEFAULT_YOUTUBE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN || 'https://besthome.onrender.com';

function normalizeVideo(url = '') {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return {
      provider: 'youtube',
      videoUrl: `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&origin=${DEFAULT_YOUTUBE_ORIGIN}`,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
    };
  }
  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return {
      provider: 'vimeo',
      videoUrl: `https://player.vimeo.com/video/${vimeoId}`,
      thumbnailUrl: `https://vumbnail.com/${vimeoId}.jpg`,
    };
  }
  return { provider: isMp4Url(url) ? 'mp4' : 'external', videoUrl: url, thumbnailUrl: null };
}

module.exports = { getYouTubeId, getVimeoId, isMp4Url, normalizeVideo };
