const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getYouTubeId,
  getYouTubeThumbnailFallbackUrl,
  getYouTubeThumbnailUrl,
  normalizeVideo,
} = require('../src/utils/media');

test('YouTube thumbnails use maxresdefault with hqdefault fallback', () => {
  const url = 'https://www.youtube.com/watch?v=VIDEO_ID';

  assert.equal(getYouTubeId(url), 'VIDEO_ID');
  assert.equal(getYouTubeThumbnailUrl(url), 'https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg');
  assert.equal(getYouTubeThumbnailFallbackUrl(url), 'https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg');
});

test('normalizeVideo includes YouTube thumbnail fallback metadata', () => {
  const normalized = normalizeVideo('https://youtu.be/abc123XYZ_0');

  assert.equal(normalized.provider, 'youtube');
  assert.equal(normalized.thumbnailUrl, 'https://img.youtube.com/vi/abc123XYZ_0/maxresdefault.jpg');
  assert.equal(normalized.thumbnailFallbackUrl, 'https://img.youtube.com/vi/abc123XYZ_0/hqdefault.jpg');
});
