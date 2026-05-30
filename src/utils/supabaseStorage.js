const crypto = require('crypto');
const path = require('path');
const slugify = require('slugify');

const CAREER_CV_BUCKET = process.env.SUPABASE_CV_BUCKET || 'career-cv';
const MAX_CV_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CV_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_CV_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

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

function buildCareerCvPath(originalName = 'cv.pdf', now = new Date()) {
  const ext = path.extname(originalName).toLowerCase() || '.pdf';
  const base = slugify(path.basename(originalName, ext), { lower: true, strict: true }) || 'cv';
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}/${month}/${crypto.randomUUID()}-${base}${ext}`;
}

function stripCareerCvBucket(filePath = '') {
  const prefix = `${CAREER_CV_BUCKET}/`;
  return String(filePath).startsWith(prefix) ? String(filePath).slice(prefix.length) : String(filePath);
}

async function uploadCareerCv(file) {
  assertValidCvFile(file);
  const { url, serviceKey } = getSupabaseConfig();
  const objectPath = buildCareerCvPath(file.originalname);
  const uploadUrl = `${url}/storage/v1/object/${CAREER_CV_BUCKET}/${encodeURI(objectPath)}`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': file.mimetype,
      'Cache-Control': 'private, max-age=31536000',
      'x-upsert': 'false',
    },
    body: file.buffer,
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    const error = new Error(`CV Supabase Storage bucketinə yüklənmədi.${details ? ` ${details}` : ''}`);
    error.status = response.status;
    throw error;
  }
  return `${CAREER_CV_BUCKET}/${objectPath}`;
}

async function createCareerCvSignedUrl(filePath, expiresIn = 60) {
  const objectPath = stripCareerCvBucket(filePath);
  if (!objectPath) {
    const error = new Error('CV fayl yolu mövcud deyil.');
    error.status = 404;
    throw error;
  }
  const { url, serviceKey } = getSupabaseConfig();
  const response = await fetch(`${url}/storage/v1/object/sign/${CAREER_CV_BUCKET}/${encodeURI(objectPath)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'CV üçün signed URL yaradılmadı.');
    error.status = response.status;
    throw error;
  }
  const signedURL = payload.signedURL || payload.signedUrl || payload.url;
  return signedURL?.startsWith('http') ? signedURL : `${url}${signedURL}`;
}

module.exports = {
  CAREER_CV_BUCKET,
  MAX_CV_SIZE_BYTES,
  ALLOWED_CV_MIME_TYPES,
  assertValidCvFile,
  buildCareerCvPath,
  uploadCareerCv,
  createCareerCvSignedUrl,
};
