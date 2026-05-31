const express = require('express');
const fs = require('fs/promises');
const prisma = require('../lib/prisma');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadToHeroBucket } = require('../utils/supabaseStorage');

const router = express.Router();
const MEDIA_TYPES = new Set(['image', 'video']);
const MEDIA_SOURCES = new Set(['upload', 'url']);
const SLIDE_TYPES = new Set(['custom', 'project']);
const PANEL_POSITIONS = new Set(['bottom-center', 'bottom-left', 'bottom-right', 'center', 'center-left', 'center-right']);
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

function parseRangeInteger(value, fallback, min, max) {
  return Math.min(Math.max(parseInteger(value, fallback), min), max);
}

function parseDuration(value, fallback = DEFAULT_SLIDE_DURATION) {
  return parseRangeInteger(value, fallback, MIN_SLIDE_DURATION, MAX_SLIDE_DURATION);
}

function normalizeChoice(value, allowed, fallback) {
  const normalized = String(value || fallback).toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
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

function firstProjectImage(project) {
  if (!project) return '';
  if (Array.isArray(project.images) && project.images.length) return String(project.images[0] || '').trim();
  return String(project.imageUrl || '').trim();
}

function projectLink(project) {
  if (!project) return '';
  return `/project/${project.slug || project.id}`;
}

async function resolveProject(projectId) {
  const id = Number.parseInt(projectId, 10);
  if (!Number.isInteger(id) || id <= 0) return null;
  return prisma.project.findUnique({ where: { id } });
}

async function normalizePayload(body = {}, uploadedUrl = null, file = null, existing = {}) {
  const slideType = normalizeChoice(body.slide_type ?? body.slideType ?? existing.slideType, SLIDE_TYPES, 'custom');
  const projectId = parseInteger(body.project_id ?? body.projectId, existing.projectId ?? 0) || null;
  const project = slideType === 'project' ? await resolveProject(projectId) : null;
  const mediaSource = normalizeChoice(body.media_source ?? body.mediaSource ?? existing.mediaSource, MEDIA_SOURCES, file ? 'upload' : 'url');
  const mediaType = inferMediaType(file, body.media_type ?? body.mediaType ?? existing.mediaType ?? 'image');
  const pastedMediaUrl = String(body.media_url ?? body.mediaUrl ?? '').trim();
  const mediaUrl = uploadedUrl || (mediaSource === 'url' ? pastedMediaUrl : '') || existing.mediaUrl || firstProjectImage(project) || '';
  const title = String(body.title ?? '').trim() || (slideType === 'project' ? project?.title : '') || existing.title || '';
  const description = String(body.description ?? '').trim() || existing.description || (slideType === 'project' ? project?.description : '') || '';
  return {
    title: String(title).trim(),
    description: String(description).trim(),
    slideType,
    projectId: slideType === 'project' ? projectId : null,
    mediaType,
    mediaSource: uploadedUrl ? 'upload' : mediaSource,
    mediaUrl,
    badgeText: String(body.badge_text ?? body.badgeText ?? existing.badgeText ?? '').trim(),
    badgeColor: String(body.badge_color ?? body.badgeColor ?? existing.badgeColor ?? '#FFFFFF').trim(),
    badgeBackground: String(body.badge_background ?? body.badgeBackground ?? existing.badgeBackground ?? 'rgba(127,127,255,0.92)').trim(),
    titleColor: String(body.title_color ?? body.titleColor ?? existing.titleColor ?? '#FFFFFF').trim(),
    titleFontSize: parseRangeInteger(body.title_font_size ?? body.titleFontSize, existing.titleFontSize ?? 48, 12, 96),
    descriptionColor: String(body.description_color ?? body.descriptionColor ?? existing.descriptionColor ?? '#F8FAFC').trim(),
    descriptionFontSize: parseRangeInteger(body.description_font_size ?? body.descriptionFontSize, existing.descriptionFontSize ?? 18, 10, 40),
    buttonBackground: String(body.button_background ?? body.buttonBackground ?? existing.buttonBackground ?? '#7F7FFF').trim(),
    buttonTextColor: String(body.button_text_color ?? body.buttonTextColor ?? existing.buttonTextColor ?? '#FFFFFF').trim(),
    panelBackground: String(body.panel_background ?? body.panelBackground ?? existing.panelBackground ?? '#111827').trim(),
    panelBlur: parseRangeInteger(body.panel_blur ?? body.panelBlur, existing.panelBlur ?? 18, 0, 60),
    panelOpacity: parseRangeInteger(body.panel_opacity ?? body.panelOpacity, existing.panelOpacity ?? 72, 0, 100),
    panelPosition: normalizeChoice(body.panel_position ?? body.panelPosition ?? existing.panelPosition, PANEL_POSITIONS, 'bottom-center'),
    heroHeightDesktop: parseRangeInteger(body.hero_height_desktop ?? body.heroHeightDesktop, existing.heroHeightDesktop ?? 560, 160, 1200),
    heroHeightTablet: parseRangeInteger(body.hero_height_tablet ?? body.heroHeightTablet, existing.heroHeightTablet ?? 420, 140, 1000),
    heroHeightMobile: parseRangeInteger(body.hero_height_mobile ?? body.heroHeightMobile, existing.heroHeightMobile ?? 320, 120, 900),
    buttonText: String(body.button_text ?? body.buttonText ?? existing.buttonText ?? '').trim(),
    buttonLink: String(body.button_link ?? body.buttonLink ?? existing.buttonLink ?? projectLink(project)).trim(),
    displayOrder: parseInteger(body.display_order ?? body.displayOrder, existing.displayOrder ?? 0),
    slideDuration: parseDuration(body.slide_duration ?? body.slideDuration, existing.slideDuration ?? DEFAULT_SLIDE_DURATION),
    isActive: parseBool(body.is_active ?? body.isActive, existing.isActive ?? true),
  };
}

function serializeHeroSlide(slide) {
  if (!slide) return slide;
  return {
    ...slide,
    slide_type: slide.slideType,
    project_id: slide.projectId,
    media_type: slide.mediaType,
    media_source: slide.mediaSource,
    media_url: slide.mediaUrl,
    badge_text: slide.badgeText,
    badge_color: slide.badgeColor,
    badge_background: slide.badgeBackground,
    title_color: slide.titleColor,
    title_font_size: slide.titleFontSize,
    description_color: slide.descriptionColor,
    description_font_size: slide.descriptionFontSize,
    button_background: slide.buttonBackground,
    button_text_color: slide.buttonTextColor,
    panel_background: slide.panelBackground,
    panel_blur: slide.panelBlur,
    panel_opacity: slide.panelOpacity,
    panel_position: slide.panelPosition,
    hero_height_desktop: slide.heroHeightDesktop,
    hero_height_tablet: slide.heroHeightTablet,
    hero_height_mobile: slide.heroHeightMobile,
    button_text: slide.buttonText,
    button_link: slide.buttonLink,
    display_order: slide.displayOrder,
    slide_duration: slide.slideDuration ?? DEFAULT_SLIDE_DURATION,
    is_active: slide.isActive,
    project: slide.project || undefined,
  };
}

function slideOrderBy() {
  return [{ displayOrder: 'asc' }, { id: 'asc' }];
}

router.get('/', asyncHandler(async (req, res) => {
  const adminView = req.query.admin === '1' || req.query.admin === 'true';
  const slides = await prisma.heroSlide.findMany({
    where: adminView ? undefined : { isActive: true },
    include: { project: true },
    orderBy: slideOrderBy(),
  });
  res.json(slides.map(serializeHeroSlide));
}));

router.post('/', authenticate, authorize('admin'), upload.single('media'), asyncHandler(async (req, res) => {
  const uploadedUrl = await uploadHeroFileWithFallback(req.file);
  const data = await normalizePayload(req.body, uploadedUrl, req.file);
  if (!data.title) return res.status(400).json({ message: 'Title is required.' });
  if (!data.mediaUrl) return res.status(400).json({ message: 'Media upload, media URL, or project image is required.' });
  const created = await prisma.heroSlide.create({ data, include: { project: true } });
  res.status(201).json(serializeHeroSlide(created));
}));

router.put('/:id', authenticate, authorize('admin'), upload.single('media'), asyncHandler(async (req, res) => {
  const existing = await prisma.heroSlide.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: 'Hero slide not found.' });
  const uploadedUrl = await uploadHeroFileWithFallback(req.file);
  const data = await normalizePayload(req.body, uploadedUrl, req.file, existing);
  if (!data.title) return res.status(400).json({ message: 'Title is required.' });
  if (!data.mediaUrl) return res.status(400).json({ message: 'Media upload, media URL, or project image is required.' });
  const updated = await prisma.heroSlide.update({ where: { id: existing.id }, data, include: { project: true } });
  res.json(serializeHeroSlide(updated));
}));

router.patch('/:id/toggle', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.heroSlide.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: 'Hero slide not found.' });
  const updated = await prisma.heroSlide.update({
    where: { id: existing.id },
    data: { isActive: parseBool(req.body?.is_active ?? req.body?.isActive, !existing.isActive) },
    include: { project: true },
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
  const slides = await prisma.heroSlide.findMany({ include: { project: true }, orderBy: slideOrderBy() });
  res.json(slides.map(serializeHeroSlide));
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.heroSlide.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
