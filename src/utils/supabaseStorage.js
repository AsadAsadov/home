const crypto = require('crypto');
const path = require('path');
const slugify = require('slugify');

const CAREER_CV_BUCKET = process.env.SUPABASE_CV_BUCKET || 'career-cv';
const LISTINGS_BUCKET = process.env.SUPABASE_LISTINGS_BUCKET || 'elanlar';
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

async function uploadToSupabaseBucket({ bucket, objectPath, file, cacheControl = 'public, max-age=31536000', upsert = false }) {
  const { url, serviceKey } = getSupabaseConfig();
  const uploadUrl = `${url}/storage/v1/object/${bucket}/${encodeStorageObjectPath(objectPath)}`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': file.mimetype,
      'Cache-Control': cacheControl,
      'x-upsert': upsert ? 'true' : 'false',
    },
    body: file.buffer,
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    const error = new Error(`Supabase Storage bucketinə yüklənmədi.${details ? ` ${details}` : ''}`);
    error.status = response.status;
    throw error;
  }
  return { bucket, objectPath };
}

function buildPublicUrl(bucket, objectPath) {
  const { url } = getSupabaseConfig();
  return `${url}/storage/v1/object/public/${bucket}/${encodeStorageObjectPath(objectPath)}`;
}

async function uploadCareerCv(file) {
  assertValidCvFile(file);
  const originalName = file.originalname;
  const sanitizedName = sanitizeFileName(originalName);
  console.info('[supabaseStorage] CV filename sanitized', {
    originalValue: originalName,
    sanitizedValue: sanitizedName,
    nullByteFound: typeof originalName === 'string' && originalName.includes('\0'),
  });
  const objectPath = buildCareerCvPath(sanitizedName);
  await uploadToSupabaseBucket({
    bucket: CAREER_CV_BUCKET,
    objectPath,
    file,
    cacheControl: 'private, max-age=31536000',
  });
  return `${CAREER_CV_BUCKET}/${objectPath}`;
}

async function uploadListingImage(file) {
  assertValidListingImage(file);
  const originalName = file.originalname || 'elan.jpg';
  const sanitizedName = sanitizeFileName(originalName);
  console.info('[supabaseStorage] listing filename sanitized', {
    originalValue: originalName,
    sanitizedValue: sanitizedName,
    nullByteFound: typeof originalName === 'string' && originalName.includes('\0'),
  });
  const objectPath = buildStoragePath(sanitizedName, 'listings');
  await uploadToSupabaseBucket({ bucket: LISTINGS_BUCKET, objectPath, file });
  return buildPublicUrl(LISTINGS_BUCKET, objectPath);
}

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
  const createSignedUrlResponse = {
    data: response.ok ? payload : null,
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
  const signedURL = payload.signedURL || payload.signedUrl || payload.url;
  return { signedUrl: signedURL?.startsWith('http') ? signedURL : `${url}${signedURL}`, ...debug };
}

async function createCareerCvSignedUrl(filePath, expiresIn = 60) {
  const result = await createCareerCvSignedUrlDebug(filePath, expiresIn);
  return result.signedUrl;
}

module.exports = {
  CAREER_CV_BUCKET,
  LISTINGS_BUCKET,
  MAX_CV_SIZE_BYTES,
  MAX_LISTING_IMAGE_SIZE_BYTES,
  sanitizeText,
  sanitizeFileName,
  ALLOWED_CV_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  assertValidCvFile,
  assertValidListingImage,
  buildCareerCvPath,
  buildStoragePath,
  encodeStorageObjectPath,
  normalizeStorageObjectPath,
  uploadCareerCv,
  uploadListingImage,
  checkSupabaseStorageObjectExists,
  checkCareerCvObjectLocations,
  createCareerCvSignedUrl,
  createCareerCvSignedUrlDebug,
};
