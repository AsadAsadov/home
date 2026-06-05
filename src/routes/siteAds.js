const express = require('express');
const prisma = require('../lib/prisma');
const { createUpload, localUploadUrl } = require('../middleware/upload');
const { adMediaFileFilter, adMediaTypeForFile } = require('../utils/adMedia');
const upload = createUpload('reklamlar', { files: 1, fileFilter: adMediaFileFilter });
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const POSITIONS = new Set(['left', 'right', 'both']);
const MEDIA_TYPES = new Set(['image', 'gif', 'video']);
const OBJECT_FITS = new Set(['cover', 'contain', 'fill']);
const DEFAULT_AD_WIDTH = 220;
const DEFAULT_AD_HEIGHT = 550;
const MIN_AD_WIDTH = 80;
const MIN_AD_HEIGHT = 80;
const MAX_AD_WIDTH = 1000;
const MAX_AD_HEIGHT = 1200;
const DEFAULT_REPEAT_COUNT = 3;
const DEFAULT_ROTATION_ORDER = 0;
const DEFAULT_DISPLAY_DURATION = 30;
const MIN_REPEAT_COUNT = 1;
const MAX_REPEAT_COUNT = 100;
const MIN_DISPLAY_DURATION = 1;
const MAX_DISPLAY_DURATION = 86400;

function asDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseBool(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseIntValue(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDimension(value, fallback, min, max, label) {
  const parsed = parseIntValue(value, fallback);
  if (parsed < min || parsed > max) {
    const error = new Error(`${label} ${min}-${max} aralığında olmalıdır.`);
    error.status = 400;
    throw error;
  }
  return parsed;
}

function normalizePayload(body, uploadedUrl = null, existing = {}, uploadedFile = null) {
  const mediaType = uploadedFile
    ? adMediaTypeForFile(uploadedFile)
    : String(body.media_type ?? body.mediaType ?? existing.mediaType ?? 'image').toLowerCase();
  const position = String(body.position ?? existing.position ?? 'left').toLowerCase();
  const objectFit = String(body.object_fit ?? body.objectFit ?? existing.objectFit ?? 'cover').toLowerCase();
  if (!MEDIA_TYPES.has(mediaType)) {
    const error = new Error('media_type image, gif və ya video olmalıdır.');
    error.status = 400;
    throw error;
  }
  if (!POSITIONS.has(position)) {
    const error = new Error('position left, right və ya both olmalıdır.');
    error.status = 400;
    throw error;
  }
  if (!OBJECT_FITS.has(objectFit)) {
    const error = new Error('object_fit cover, contain və ya fill olmalıdır.');
    error.status = 400;
    throw error;
  }

  const widthPx = parseDimension(body.width_px ?? body.widthPx, existing.widthPx ?? DEFAULT_AD_WIDTH, MIN_AD_WIDTH, MAX_AD_WIDTH, 'width_px');
  const heightPx = parseDimension(body.height_px ?? body.heightPx, existing.heightPx ?? DEFAULT_AD_HEIGHT, MIN_AD_HEIGHT, MAX_AD_HEIGHT, 'height_px');

  const mediaUrl = uploadedUrl || body.media_url || body.mediaUrl || body.image_url || body.imageUrl || existing.mediaUrl || existing.imageUrl || null;
  const clickUrl = body.click_url ?? body.clickUrl ?? body.target_url ?? body.targetUrl ?? existing.clickUrl ?? existing.targetUrl ?? null;
  const repeatCount = parseDimension(body.repeat_count ?? body.repeatCount, existing.repeatCount ?? DEFAULT_REPEAT_COUNT, MIN_REPEAT_COUNT, MAX_REPEAT_COUNT, 'repeat_count');
  const displayDuration = parseDimension(body.display_duration ?? body.displayDuration, existing.displayDuration ?? DEFAULT_DISPLAY_DURATION, MIN_DISPLAY_DURATION, MAX_DISPLAY_DURATION, 'display_duration');

  return {
    title: String(body.title ?? existing.title ?? '').trim(),
    mediaType,
    mediaUrl,
    imageUrl: mediaUrl,
    clickUrl,
    targetUrl: clickUrl,
    position,
    displayOrder: parseIntValue(body.display_order ?? body.displayOrder, existing.displayOrder ?? 0),
    repeatCount,
    rotationOrder: parseIntValue(body.rotation_order ?? body.rotationOrder, existing.rotationOrder ?? DEFAULT_ROTATION_ORDER),
    displayDuration,
    widthPx,
    heightPx,
    objectFit,
    isActive: parseBool(body.is_active ?? body.isActive, existing.isActive ?? true),
    startDate: asDate(body.start_date ?? body.startDate) ?? null,
    endDate: asDate(body.end_date ?? body.endDate) ?? null,
  };
}


function responsiveAdSizing(widthPx, heightPx) {
  const ratio = Number((widthPx / heightPx).toFixed(4));
  return {
    baseWidthPx: widthPx,
    baseHeightPx: heightPx,
    aspectRatio: ratio,
    css: {
      width: 'clamp(220px, 15.625vw, 340px)',
      height: 'clamp(550px, 33.854vw, 750px)',
      maxWidth: 'min(100%, clamp(220px, 15.625vw, 340px))',
    },
    breakpoints: [
      { viewportWidth: 1366, widthPx: 220, heightPx: 550 },
      { viewportWidth: 1600, widthPx: 260, heightPx: 600 },
      { viewportWidth: 1920, widthPx: 300, heightPx: 650 },
      { viewportWidth: 2560, widthPx: 340, heightPx: 750 },
    ],
    layoutRules: { preserveAspectRatio: true, balancedSideColumns: true, noHorizontalScroll: true, noOverlap: true },
  };
}

function serializeSiteAd(ad) {
  if (!ad) return ad;
  const widthPx = ad.widthPx ?? DEFAULT_AD_WIDTH;
  const heightPx = ad.heightPx ?? DEFAULT_AD_HEIGHT;
  const objectFit = ad.objectFit ?? 'cover';
  const repeatCount = ad.repeatCount ?? DEFAULT_REPEAT_COUNT;
  const rotationOrder = ad.rotationOrder ?? DEFAULT_ROTATION_ORDER;
  const displayDuration = ad.displayDuration ?? DEFAULT_DISPLAY_DURATION;
  return {
    ...ad,
    widthPx,
    heightPx,
    objectFit,
    repeatCount,
    rotationOrder,
    displayDuration,
    repeat_count: repeatCount,
    rotation_order: rotationOrder,
    display_duration: displayDuration,
    width_px: widthPx,
    height_px: heightPx,
    object_fit: objectFit,
    responsive: responsiveAdSizing(widthPx, heightPx),
  };
}

function parseAdOrder(body) {
  const raw = Array.isArray(body?.order) ? body.order : [];
  return raw.map((item, index) => ({
    id: Number.parseInt(typeof item === 'object' ? item.id : item, 10),
    displayOrder: index + 1,
    rotationOrder: index + 1,
  })).filter((item) => Number.isInteger(item.id) && item.id > 0);
}

function activeDateWhere(now = new Date()) {
  return {
    isActive: true,
    OR: [{ startDate: null }, { startDate: { lte: now } }],
    AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
  };
}


function uploadedAdUrl(file) {
  return file ? localUploadUrl(file) : null;
}

router.get('/', asyncHandler(async (req, res) => {
  const admin = req.query.admin === '1' || req.query.admin === 'true';
  const items = await prisma.siteAd.findMany({
    where: admin ? undefined : activeDateWhere(),
    orderBy: admin ? [{ position: 'asc' }, { displayOrder: 'asc' }, { rotationOrder: 'asc' }, { createdAt: 'asc' }] : [{ rotationOrder: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(items.map(serializeSiteAd));
}));

router.get('/stats', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const aggregate = await prisma.siteAd.aggregate({ _count: { id: true }, _sum: { viewCount: true, clickCount: true } });
  const activeAds = await prisma.siteAd.count({ where: activeDateWhere() });
  res.json({ totalAds: aggregate._count.id || 0, activeAds, totalViews: aggregate._sum.viewCount || 0, totalClicks: aggregate._sum.clickCount || 0 });
}));

router.post('/:id/view', asyncHandler(async (req, res) => {
  const updated = await prisma.siteAd.update({ where: { id: Number(req.params.id) }, data: { viewCount: { increment: 1 } } });
  res.json({ id: updated.id, viewCount: updated.viewCount });
}));

router.post('/:id/click', asyncHandler(async (req, res) => {
  const updated = await prisma.siteAd.update({ where: { id: Number(req.params.id) }, data: { clickCount: { increment: 1 } } });
  res.json({ id: updated.id, clickCount: updated.clickCount });
}));

router.post('/', authenticate, authorize('admin'), upload.single('media'), asyncHandler(async (req, res) => {
  const uploadedUrl = uploadedAdUrl(req.file);
  const data = normalizePayload(req.body, uploadedUrl, {}, req.file);
  if (!data.title) return res.status(400).json({ message: 'Title is required.' });
  if (!data.mediaUrl) return res.status(400).json({ message: 'Media URL is required.' });
  const created = await prisma.siteAd.create({ data });
  res.status(201).json(serializeSiteAd(created));
}));

router.put('/reorder', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const items = parseAdOrder(req.body);
  if (!items.length) return res.status(400).json({ message: 'Advertisement order array is required.' });
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    return res.status(400).json({ message: 'Advertisement IDs must be unique.' });
  }

  await prisma.$transaction(items.map((item) => prisma.siteAd.update({
    where: { id: item.id },
    data: { displayOrder: item.displayOrder, rotationOrder: item.rotationOrder },
  })));
  const ads = await prisma.siteAd.findMany({ orderBy: [{ rotationOrder: 'asc' }, { displayOrder: 'asc' }, { id: 'asc' }] });
  res.json({ ok: true, items: ads.map(serializeSiteAd) });
}));

router.put('/:id', authenticate, authorize('admin'), upload.single('media'), asyncHandler(async (req, res) => {
  const existing = await prisma.siteAd.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: 'Advertisement not found.' });
  const uploadedUrl = uploadedAdUrl(req.file);
  const data = normalizePayload(req.body, uploadedUrl, existing, req.file);
  if (!data.title) return res.status(400).json({ message: 'Title is required.' });
  if (!data.mediaUrl) return res.status(400).json({ message: 'Media URL is required.' });
  const updated = await prisma.siteAd.update({ where: { id: existing.id }, data });
  res.json(serializeSiteAd(updated));
}));

router.patch('/:id/toggle', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.siteAd.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: 'Advertisement not found.' });
  const updated = await prisma.siteAd.update({ where: { id: existing.id }, data: { isActive: parseBool(req.body?.is_active ?? req.body?.isActive, !existing.isActive) } });
  res.json(serializeSiteAd(updated));
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.siteAd.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
