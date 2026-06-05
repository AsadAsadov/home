const crypto = require('crypto');
const path = require('path');
const slugify = require('slugify');

const CAREER_CV_BUCKET = process.env.SUPABASE_CV_BUCKET || 'career-cv';
const LISTINGS_BUCKET = process.env.SUPABASE_LISTINGS_BUCKET || 'elanlar';
const GALLERY_BUCKET = process.env.SUPABASE_GALLERY_BUCKET || 'gallery';
const ADS_BUCKET = process.env.SUPABASE_ADS_BUCKET || 'reklamlar';
const AVATARS_BUCKET = process.env.SUPABASE_AVATARS_BUCKET || 'avatars';
const HERO_BUCKET = process.env.SUPABASE_HERO_BUCKET || 'siteimage';
const MAX_CV_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_LISTING_IMAGE_SIZE_BYTES = Number(process.env.MAX_LISTING_IMAGE_SIZE_BYTES || 15 * 1024 * 1024);
const ALLOWED_CV_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_CV_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || '').replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    const error = new Error('Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    error.status = 500;
    throw error;
  }
  return { url, serviceKey };
}

function assertValidCvFile(file) {
  if (!file) {
    const error = new Error('CV faylı tələb olunur.');
    error.status = 400;
    throw error;
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_CV_MIME_TYPES.has(file.mimetype) || !ALLOWED_CV_EXTENSIONS.has(ext)) {
    const error = new Error('Yalnız PDF, DOC və DOCX CV faylları qəbul olunur.');
    error.status = 400;
    throw error;
  }
  if (file.size > MAX_CV_SIZE_BYTES) {
    const error = new Error('CV faylı maksimum 10MB ola bilər.');
    error.status = 413;
    throw error;
  }
}

function assertValidListingImage(file) {
  if (!file) {
    const error = new Error('Elan şəkli tələb olunur.');
    error.status = 400;
    throw error;
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    const error = new Error('Elan üçün yalnız JPEG, PNG, WEBP, GIF və AVIF şəkilləri qəbul olunur.');
    error.status = 400;
    throw error;
  }
  if (file.size > MAX_LISTING_IMAGE_SIZE_BYTES) {
    const error = new Error('Elan şəkli maksimum 15MB ola bilər.');
    error.status = 413;
    throw error;
  }
}

function sanitizeText(value) {
  return typeof value === 'string'
    ? value.replace(/\0/g, '').trim()
    : value;
}

function sanitizeFileName(originalName = 'file') {
  const sanitized = sanitizeText(originalName);
  return sanitized || 'file';
}

function buildStoragePath(originalName = 'file', folder = '', now = new Date()) {
  const safeOriginalName = sanitizeFileName(originalName);
  const ext = path.extname(safeOriginalName).toLowerCase();
  const base = slugify(path.basename(safeOriginalName, ext), { lower: true, strict: true }) || 'file';
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return [folder, year, month, `${crypto.randomUUID()}-${base}${ext || ''}`].filter(Boolean).join('/');
}

function buildCareerCvPath(originalName = 'cv.pdf', now = new Date()) {
  const safeOriginalName = sanitizeFileName(originalName || 'cv.pdf');
  const ext = path.extname(safeOriginalName).toLowerCase() || '.pdf';
  const base = slugify(path.basename(safeOriginalName, ext), { lower: true, strict: true }) || 'cv';
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}/${month}/${crypto.randomUUID()}-${base}${ext}`;
}

function safeDecode(value = '') {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

function encodeStorageObjectPath(objectPath = '') {
  return String(objectPath).split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function normalizeStorageObjectPath(filePath = '', bucket = CAREER_CV_BUCKET) {
  let value = String(filePath || '').trim().replace(/^\/+/, '');
  if (!value) return '';

  const marker = '/storage/v1/object/';
  const markerIndex = value.indexOf(marker);
  if (markerIndex !== -1) {
    value = value.slice(markerIndex + marker.length);
    value = value.replace(/^public\//, '').replace(/^sign\//, '');
  }

  value = value.split('?')[0].split('#')[0].replace(/^\/+/, '');
  const bucketPrefix = `${bucket}/`;
  while (value === bucket || value.startsWith(bucketPrefix)) {
    value = value === bucket ? '' : value.slice(bucketPrefix.length);
  }
  return safeDecode(value).replace(/^\/+/, '');
}

function localUploadUrl(file) {
  if (!file?.path) {
    const error = new Error('Yükləmə üçün lokal fayl tapılmadı.');
    error.status = 400;
    throw error;
  }
  return require('../middleware/upload').localUploadUrl(file);
}

async function uploadCareerCv(file) { assertValidCvFile(file); return localUploadUrl(file); }

function assertValidGalleryFile(file) {
  if (!file) { const error = new Error('Qalereya faylı tələb olunur.'); error.status = 400; throw error; }
  const isImage = ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype);
  const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.mimetype);
  if (!isImage && !isVideo) { const error = new Error('Qalereya üçün yalnız şəkil və MP4/WebM/MOV video faylları qəbul olunur.'); error.status = 400; throw error; }
}

function assertValidHeroFile(file) {
  if (!file) { const error = new Error('Hero media faylı tələb olunur.'); error.status = 400; throw error; }
  if (!new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']).has(file.mimetype)) { const error = new Error('Hero üçün yalnız JPG, PNG, WEBP, GIF, MP4 və WEBM faylları qəbul olunur.'); error.status = 400; throw error; }
}

function assertValidAdFile(file) {
  if (!file) { const error = new Error('Reklam faylı tələb olunur.'); error.status = 400; throw error; }
  const isImage = ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype);
  const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.mimetype);
  if (!isImage && !isVideo) { const error = new Error('Reklam üçün yalnız şəkil/GIF və MP4/WebM/MOV video faylları qəbul olunur.'); error.status = 400; throw error; }
}

async function uploadToHeroBucket(file) { assertValidHeroFile(file); return localUploadUrl(file); }
async function uploadToAdBucket(file) { assertValidAdFile(file); return localUploadUrl(file); }
async function uploadToGalleryBucket(file) { assertValidGalleryFile(file); return localUploadUrl(file); }
async function uploadAvatarImage(file) { assertValidListingImage(file); return localUploadUrl(file); }
async function uploadListingImage(file) { assertValidListingImage(file); return localUploadUrl(file); }

async function checkSupabaseStorageObjectExists(bucket, objectPath) {
  const { url, serviceKey } = getSupabaseConfig();
  const requestedPath = String(objectPath || '').trim().replace(/^\/+/, '');
  const normalizedPath = normalizeStorageObjectPath(requestedPath, bucket);
  const requestUrl = `${url}/storage/v1/object/${bucket}/${encodeStorageObjectPath(requestedPath)}`;
  const response = await fetch(requestUrl, {
    method: 'HEAD',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
  });
  const result = {
    bucket,
    originalPath: objectPath,
    requestedPath,
    normalizedPath,
    requestUrl,
    status: response.status,
    ok: response.ok,
    exists: response.ok,
  };
  console.log('[supabaseStorage] object existence check', result);
  return result;
}

async function checkCareerCvObjectLocations(filePath) {
  const originalPath = String(filePath || '').trim().replace(/^\/+/, '');
  const normalizedPath = normalizeStorageObjectPath(originalPath, CAREER_CV_BUCKET);
  const candidates = Array.from(new Set([normalizedPath, originalPath].filter(Boolean)));
  const results = [];
  for (const candidatePath of candidates) {
    results.push(await checkSupabaseStorageObjectExists(CAREER_CV_BUCKET, candidatePath));
  }
  const located = results.find((item) => item.exists) || null;
  const debug = {
    bucket: CAREER_CV_BUCKET,
    originalPath,
    normalizedPath,
    candidates: results,
    locatedPath: located?.requestedPath || null,
  };
  console.log('[supabaseStorage] career CV object locations', debug);
  return debug;
}


function signedUrlFromSupabaseData(data, supabaseUrl) {
  const signedUrl = data?.signedUrl || data?.signedURL || data?.url;
  if (!signedUrl) return undefined;
  if (signedUrl.startsWith('http')) return signedUrl;
  if (signedUrl.startsWith('/storage/v1/')) return `${supabaseUrl}${signedUrl}`;
  if (signedUrl.startsWith('/object/')) return `${supabaseUrl}/storage/v1${signedUrl}`;
  return `${supabaseUrl}/storage/v1/${signedUrl.replace(/^\/+/, '')}`;
}

async function createCareerCvSignedUrlDebug(filePath, expiresIn = 60) {
  const objectPath = normalizeStorageObjectPath(filePath, CAREER_CV_BUCKET);
  console.log({
    bucket: CAREER_CV_BUCKET,
    originalPath: filePath,
    normalizedPath: objectPath,
  });
  if (!objectPath) {
    const error = new Error('CV fayl yolu mövcud deyil.');
    error.status = 404;
    error.debug = { originalPath: filePath, normalizedPath: objectPath };
    throw error;
  }
  const { url, serviceKey } = getSupabaseConfig();
  const requestUrl = `${url}/storage/v1/object/sign/${CAREER_CV_BUCKET}/${encodeStorageObjectPath(objectPath)}`;
  const createSignedUrlParams = {
    bucket: CAREER_CV_BUCKET,
    path: objectPath,
    expiresIn,
    requestUrl,
  };
  console.log('[supabaseStorage] createSignedUrl parameters', createSignedUrlParams);
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn }),
  });
  const payload = await response.json().catch(() => ({}));
  const data = response.ok ? { ...payload, signedUrl: signedUrlFromSupabaseData(payload, url) } : null;
  console.log(data);
  const createSignedUrlResponse = {
    data,
    error: response.ok ? null : payload,
    status: response.status,
    ok: response.ok,
  };
  console.log('[supabaseStorage] createSignedUrl response', createSignedUrlResponse);
  const debug = {
    bucket: CAREER_CV_BUCKET,
    originalPath: filePath,
    normalizedPath: objectPath,
    requestUrl,
    createSignedUrlParams,
    createSignedUrlResponse,
    supabaseResponse: payload,
    status: response.status,
    ok: response.ok,
  };
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || 'CV üçün signed URL yaradılmadı.');
    error.status = response.status;
    error.code = payload.error || payload.code;
    error.meta = debug;
    throw error;
  }
  return { signedUrl: data.signedUrl, ...debug, createSignedUrlResponse };
}

async function createCareerCvSignedUrl(filePath, expiresIn = 60) {
  const result = await createCareerCvSignedUrlDebug(filePath, expiresIn);
  return result.signedUrl;
}

module.exports = {
  CAREER_CV_BUCKET,
  LISTINGS_BUCKET,
  GALLERY_BUCKET,
  ADS_BUCKET,
  AVATARS_BUCKET,
  HERO_BUCKET,
  MAX_CV_SIZE_BYTES,
  MAX_LISTING_IMAGE_SIZE_BYTES,
  sanitizeText,
  sanitizeFileName,
  ALLOWED_CV_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  assertValidCvFile,
  assertValidListingImage,
  assertValidGalleryFile,
  assertValidAdFile,
  assertValidHeroFile,
  buildCareerCvPath,
  buildStoragePath,
  encodeStorageObjectPath,
  normalizeStorageObjectPath,
  uploadCareerCv,
  uploadAvatarImage,
  uploadListingImage,
  uploadToGalleryBucket,
  uploadToAdBucket,
  uploadToHeroBucket,
  checkSupabaseStorageObjectExists,
  checkCareerCvObjectLocations,
  createCareerCvSignedUrl,
  createCareerCvSignedUrlDebug,
};
