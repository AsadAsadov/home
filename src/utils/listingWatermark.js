const fs = require('fs/promises');
const path = require('path');

const WATERMARK_TEXT = 'besthome.az';
const SUPPORTED_WATERMARK_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const SHARP_OUTPUT_OPTIONS = {
  jpeg: { quality: 88, mozjpeg: true },
  png: { compressionLevel: 9, adaptiveFiltering: true },
  webp: { quality: 86 },
  avif: { quality: 52 },
};

let sharpOverride;

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function mimeTypeFromPath(inputPath = '') {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.avif') return 'image/avif';
  return '';
}

function isWatermarkSupported(fileOrPath) {
  const mimetype = typeof fileOrPath === 'string'
    ? mimeTypeFromPath(fileOrPath)
    : (fileOrPath?.mimetype || mimeTypeFromPath(fileOrPath?.path));
  return SUPPORTED_WATERMARK_MIME_TYPES.has(mimetype);
}

function buildWatermarkSvg(width, height) {
  const smallerSide = Math.max(1, Math.min(width, height));
  const centerFontSize = Math.round(clamp(smallerSide * 0.13, 30, 140));
  const cornerFontSize = Math.round(clamp(width * 0.035, 13, 30));
  const padding = Math.round(clamp(smallerSide * 0.035, 14, 42));
  const text = escapeXml(WATERMARK_TEXT);

  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="cornerShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="1" stdDeviation="1.4" flood-color="#000000" flood-opacity="0.55"/>
        </filter>
        <filter id="centerShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        transform="rotate(-15 ${width / 2} ${height / 2})"
        font-family="Arial, Helvetica, sans-serif" font-size="${centerFontSize}" font-weight="700"
        fill="#f5f5f5" opacity="0.12" filter="url(#centerShadow)">${text}</text>
      <text x="${width - padding}" y="${height - padding}" text-anchor="end" dominant-baseline="auto"
        font-family="Arial, Helvetica, sans-serif" font-size="${cornerFontSize}" font-weight="700"
        fill="#ffffff" opacity="0.42" filter="url(#cornerShadow)">${text}</text>
    </svg>
  `);
}

function outputFormatFromMetadata(metadata = {}, inputPath = '') {
  const format = String(metadata.format || '').toLowerCase();
  if (['jpeg', 'png', 'webp', 'avif'].includes(format)) return format;
  const mimetype = mimeTypeFromPath(inputPath);
  if (mimetype === 'image/jpeg') return 'jpeg';
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  if (mimetype === 'image/avif') return 'avif';
  return 'jpeg';
}

function loadSharp() {
  return sharpOverride || require('sharp');
}

async function applyListingWatermark(inputPath, options = {}) {
  if (!inputPath || !isWatermarkSupported({ path: inputPath, mimetype: options.mimetype })) return inputPath;

  try {
    await fs.access(inputPath);
  } catch (_error) {
    return inputPath;
  }

  const sharp = loadSharp();
  const image = sharp(inputPath, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  if (!width || !height) return inputPath;

  const format = outputFormatFromMetadata(metadata, inputPath);
  const outputOptions = SHARP_OUTPUT_OPTIONS[format] || SHARP_OUTPUT_OPTIONS.jpeg;
  const tempPath = `${inputPath}.watermark-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`;

  let pipeline = image.composite([{ input: buildWatermarkSvg(width, height), gravity: 'southeast' }]);
  if (typeof pipeline[format] === 'function') {
    pipeline = pipeline[format](outputOptions);
  }
  await pipeline.toFile(tempPath);
  await fs.rename(tempPath, inputPath);
  return inputPath;
}

function setSharpForTest(sharp) {
  sharpOverride = sharp;
}

module.exports = {
  WATERMARK_TEXT,
  SUPPORTED_WATERMARK_MIME_TYPES,
  applyListingWatermark,
  buildWatermarkSvg,
  isWatermarkSupported,
  setSharpForTest,
};
