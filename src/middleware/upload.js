const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const slugify = require('slugify');

const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

function datedFolder(folder, now = new Date()) {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return path.join(folder, year, month);
}

function safeFilename(originalName = 'file') {
  const cleanName = String(originalName).replace(/\0/g, '').trim() || 'file';
  const ext = path.extname(cleanName).toLowerCase();
  const base = slugify(path.basename(cleanName, ext), { lower: true, strict: true }) || 'file';
  return `${crypto.randomUUID()}-${base}${ext}`;
}

function createUpload(folder = 'siteimage', options = {}) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const destination = path.join(uploadRoot, datedFolder(folder));
      fs.mkdir(destination, { recursive: true }, (error) => cb(error, destination));
    },
    filename: (_req, file, cb) => cb(null, safeFilename(file.originalname)),
  });

  return multer({
    storage,
    limits: {
      fileSize: Number(options.fileSize || process.env.MAX_UPLOAD_FILE_SIZE || 100 * 1024 * 1024),
      files: Number(options.files || process.env.MAX_UPLOAD_FILES || 25),
      fieldSize: 50 * 1024 * 1024,
    },
    fileFilter: options.fileFilter || ((_req, file, cb) => cb(null, allowedMimeTypes.has(file.mimetype))),
  });
}

function localUploadUrl(file) {
  if (!file?.path) return null;
  const relativePath = path.relative(uploadRoot, file.path).split(path.sep).join('/');
  return `/uploads/${relativePath}`;
}

const allowedMimeTypes = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = createUpload('siteimage');
upload.createUpload = createUpload;
upload.localUploadUrl = localUploadUrl;
upload.safeFilename = safeFilename;
upload.uploadRoot = uploadRoot;

module.exports = upload;
