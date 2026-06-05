const path = require('path');

const AD_MEDIA_MIME_TYPES_BY_EXTENSION = new Map([
  ['.jpg', new Set(['image/jpeg'])],
  ['.jpeg', new Set(['image/jpeg'])],
  ['.png', new Set(['image/png'])],
  ['.webp', new Set(['image/webp'])],
  ['.gif', new Set(['image/gif'])],
  ['.mp4', new Set(['video/mp4'])],
  ['.webm', new Set(['video/webm'])],
  ['.mov', new Set(['video/quicktime'])],
]);

const AD_MEDIA_ACCEPTED_EXTENSIONS = [...AD_MEDIA_MIME_TYPES_BY_EXTENSION.keys()];

function adMediaTypeForFile(file = {}) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (extension === '.gif') return 'gif';
  if (String(file.mimetype || '').startsWith('video/') || ['.mp4', '.webm', '.mov'].includes(extension)) return 'video';
  return 'image';
}

function isValidAdMediaFile(file = {}) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const allowedMimeTypes = AD_MEDIA_MIME_TYPES_BY_EXTENSION.get(extension);
  return Boolean(allowedMimeTypes?.has(String(file.mimetype || '').toLowerCase()));
}

function adMediaFileFilter(_req, file, callback) {
  if (isValidAdMediaFile(file)) return callback(null, true);
  const error = new Error('Reklam üçün yalnız JPG, JPEG, PNG, WEBP, GIF, MP4, WEBM və MOV faylları qəbul olunur.');
  error.status = 400;
  return callback(error);
}

module.exports = {
  AD_MEDIA_ACCEPTED_EXTENSIONS,
  adMediaFileFilter,
  adMediaTypeForFile,
  isValidAdMediaFile,
};
