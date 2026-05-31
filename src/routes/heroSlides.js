const express = require('express');
const fs = require('fs/promises');
const prisma = require('../lib/prisma');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadToHeroBucket } = require('../utils/supabaseStorage');

const router = express.Router();
const MEDIA_TYPES = new Set(['image', 'video']);
const DEFAULT_SLIDE_DURATION = 10;
const MIN_SLIDE_DURATION = 1;
const MAX_SLIDE_DURATION = 3600;

function parseBool(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDuration(value, fallback = DEFAULT_SLIDE_DURATION) {
  const parsed = parseInteger(value, fallback);
  return Math.min(Math.max(parsed, MIN_SLIDE_DURATION), MAX_SLIDE_DURATION);
}

function inferMediaType(file, requested = 'image') {
  if (file?.mimetype?.startsWith('video/')) return 'video';
  if (file?.mimetype?.startsWith('image/')) return 'image';
  const mediaType = String(requested || 'image').toLowerCase();
  if (!MEDIA_TYPES.has(mediaType)) {
    const error = new Error('media_type image və ya video olmalıdır.');
    error.status = 400;
    throw error;
  }
  return mediaType;
}

async function uploadHeroFileWithFallback(file) {
  if (!file) return null;
  try {
    return await uploadToHeroBucket(file);
  } finally {
    if (file.path) await fs.unlink(file.path).catch(() => {});
  }
}

function normalizePayload(body = {}, uploadedUrl = null, file = null, existing = {}) {
  const mediaType = inferMediaType(file, body.media_type ?? body.mediaType ?? existing.mediaType ?? 'image');
  const mediaUrl = uploadedUrl || existing.mediaUrl || '';
  return {
    title: String(body.title ?? existing.title ?? '').trim(),
    description: String(body.description ?? existing.description ?? '').trim(),
    mediaType,
    mediaUrl,
    buttonText: String(body.button_text ?? body.buttonText ?? existing.buttonText ?? '').trim(),
    buttonLink: String(body.button_link ?? body.buttonLink ?? existing.buttonLink ?? '').trim(),
    displayOrder: parseInteger(body.display_order ?? body.displayOrder, existing.displayOrder ?? 0),
    slideDuration: parseDuration(body.slide_duration ?? body.slideDuration, existing.slideDuration ?? DEFAULT_SLIDE_DURATION),
    isActive: parseBool(body.is_active ?? body.isActive, existing.isActive ?? true),
  };
}

function serializeHeroSlide(slide) {
  if (!slide) return slide;
  return {
    ...slide,
    media_type: slide.mediaType,
    media_url: slide.mediaUrl,
    button_text: slide.buttonText,
    button_link: slide.buttonLink,
    display_order: slide.displayOrder,
    slide_duration: slide.slideDuration ?? DEFAULT_SLIDE_DURATION,
    is_active: slide.isActive,
  };
}

function slideOrderBy() {
  return [{ displayOrder: 'asc' }, { id: 'asc' }];
}

router.get('/', asyncHandler(async (req, res) => {
  const adminView = req.query.admin === '1' || req.query.admin === 'true';
  const slides = await prisma.heroSlide.findMany({
    where: adminView ? undefined : { isActive: true },
    orderBy: slideOrderBy(),
  });
  res.json(slides.map(serializeHeroSlide));
}));

router.post('/', authenticate, authorize('admin'), upload.single('media'), asyncHandler(async (req, res) => {
  const uploadedUrl = await uploadHeroFileWithFallback(req.file);
  const data = normalizePayload(req.body, uploadedUrl, req.file);
  if (!data.title) return res.status(400).json({ message: 'Title is required.' });
  if (!data.mediaUrl) return res.status(400).json({ message: 'Media upload is required.' });
  const created = await prisma.heroSlide.create({ data });
  res.status(201).json(serializeHeroSlide(created));
}));

router.put('/:id', authenticate, authorize('admin'), upload.single('media'), asyncHandler(async (req, res) => {
  const existing = await prisma.heroSlide.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: 'Hero slide not found.' });
  const uploadedUrl = await uploadHeroFileWithFallback(req.file);
  const data = normalizePayload(req.body, uploadedUrl, req.file, existing);
  if (!data.title) return res.status(400).json({ message: 'Title is required.' });
  if (!data.mediaUrl) return res.status(400).json({ message: 'Media upload is required.' });
  const updated = await prisma.heroSlide.update({ where: { id: existing.id }, data });
  res.json(serializeHeroSlide(updated));
}));

router.patch('/:id/toggle', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.heroSlide.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: 'Hero slide not found.' });
  const updated = await prisma.heroSlide.update({
    where: { id: existing.id },
    data: { isActive: parseBool(req.body?.is_active ?? req.body?.isActive, !existing.isActive) },
  });
  res.json(serializeHeroSlide(updated));
}));

router.patch('/reorder', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ message: 'Reorder items are required.' });
  await prisma.$transaction(items.map((item, index) => prisma.heroSlide.update({
    where: { id: Number(item.id) },
    data: { displayOrder: parseInteger(item.display_order ?? item.displayOrder, index + 1) },
  })));
  const slides = await prisma.heroSlide.findMany({ orderBy: slideOrderBy() });
  res.json(slides.map(serializeHeroSlide));
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.heroSlide.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
