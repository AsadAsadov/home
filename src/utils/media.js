function getYouTubeId(url = '') {
  const match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1] || null;
}

function getVimeoId(url = '') {
  const match = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] || null;
}

function normalizeVideo(url = '') {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return {
      videoUrl: `https://www.youtube.com/embed/${youtubeId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }
  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return {
      videoUrl: `https://player.vimeo.com/video/${vimeoId}`,
      thumbnailUrl: `https://vumbnail.com/${vimeoId}.jpg`,
    };
  }
  return { videoUrl: url, thumbnailUrl: null };
}

module.exports = { normalizeVideo };
