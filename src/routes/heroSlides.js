const express = require('express');
const fs = require('fs/promises');
const prisma = require('../lib/prisma');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadToHeroBucket } = require('../utils/supabaseStorage');

const router = express.Router();
const MEDIA_TYPES = new Set(['image', 'video']);
const SLIDE_TYPES = new Set(['custom', 'project']);
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

function inferMediaType(file, requested = 'image', mediaUrl = '') {
  if (file?.mimetype?.startsWith('video/')) return 'video';
  if (file?.mimetype?.startsWith('image/')) return 'image';
  const mediaType = String(requested || '').toLowerCase();
  if (MEDIA_TYPES.has(mediaType)) return mediaType;
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(String(mediaUrl || '')) ? 'video' : 'image';
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
  if (project.imageUrl) return String(project.imageUrl || '').trim();
  if (Array.isArray(project.images) && project.images.length) return String(project.images[0] || '').trim();
  return '';
}

function projectLink(project) {
  if (!project) return '';
  return `/project/${project.slug || project.id}`;
}

function projectToHeroSlide(project, index = 0) {
  const mediaUrl = firstProjectImage(project);
  return {
    id: `project-${project.id}`,
    title: String(project.title || '').trim(),
    description: '',
    slideType: 'project',
    projectId: project.id,
    mediaType: inferMediaType(null, 'image', mediaUrl),
    mediaUrl,
    badgeText: '',
    badgeColor: '#C8A96A',
    badgeBackground: '#111827',
    titleColor: '#FFFFFF',
    titleFontSize: 34,
    descriptionColor: '#F8FAFC',
    descriptionFontSize: 14,
    buttonBackground: '#FFFFFF',
    buttonTextColor: '#111827',
    panelBackground: '#111827',
    panelBlur: 10,
    panelOpacity: 35,
    panelPosition: 'bottom-left',
    heroHeightDesktop: 520,
    heroHeightTablet: 420,
    heroHeightMobile: 280,
    buttonText: 'Layihəyə Bax →',
    buttonLink: projectLink(project),
    displayOrder: project.displayOrder ?? index + 1,
    slideDuration: DEFAULT_SLIDE_DURATION,
    isActive: true,
    createdAt: project.createdAt,
    project,
    generatedFromProject: true,
  };
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
  const pastedMediaUrl = String(body.media_url ?? body.mediaUrl ?? '').trim();
  const mediaUrl = slideType === 'project'
    ? firstProjectImage(project)
    : (uploadedUrl || pastedMediaUrl || existing.mediaUrl || '');
  const title = slideType === 'project'
    ? String(project?.title || '').trim()
    : String(body.title ?? existing.title ?? '').trim();
  const buttonText = slideType === 'project'
    ? 'Layihəyə Bax →'
    : String(body.button_text ?? body.buttonText ?? existing.buttonText ?? '').trim();
  const buttonLink = slideType === 'project'
    ? projectLink(project)
    : String(body.button_link ?? body.buttonLink ?? existing.buttonLink ?? '').trim();

  return {
    title,
    description: slideType === 'project' ? '' : String(body.description ?? existing.description ?? '').trim(),
    slideType,
    projectId: slideType === 'project' ? projectId : null,
    mediaType: inferMediaType(file, body.media_type ?? body.mediaType ?? existing.mediaType ?? 'image', mediaUrl),
    mediaUrl,
    badgeText: String(body.badge_text ?? body.badgeText ?? existing.badgeText ?? '').trim(),
    badgeColor: String(body.badge_color ?? body.badgeColor ?? existing.badgeColor ?? '#C8A96A').trim(),
    badgeBackground: String(body.badge_background ?? body.badgeBackground ?? existing.badgeBackground ?? '#111827').trim(),
    titleColor: String(body.title_color ?? body.titleColor ?? existing.titleColor ?? '#FFFFFF').trim(),
    titleFontSize: 34,
    descriptionColor: '#F8FAFC',
    descriptionFontSize: 14,
    buttonBackground: String(body.button_background ?? body.buttonBackground ?? existing.buttonBackground ?? '#FFFFFF').trim(),
    buttonTextColor: String(body.button_text_color ?? body.buttonTextColor ?? existing.buttonTextColor ?? '#111827').trim(),
    panelBackground: '#111827',
    panelBlur: 0,
    panelOpacity: 0,
    panelPosition: 'bottom-left',
    heroHeightDesktop: 520,
    heroHeightTablet: 420,
    heroHeightMobile: 280,
    buttonText,
    buttonLink,
    displayOrder: parseInteger(body.display_order ?? body.displayOrder, existing.displayOrder ?? 0),
    slideDuration: parseDuration(body.slide_duration ?? body.slideDuration, existing.slideDuration ?? DEFAULT_SLIDE_DURATION),
    isActive: parseBool(body.is_active ?? body.isActive, existing.isActive ?? true),
  };
}

function serializeHeroSlide(slide) {
  if (!slide) return slide;
  const isProjectSlide = slide.slideType === 'project';
  const project = slide.project || null;
  const dynamicMediaUrl = isProjectSlide && project ? firstProjectImage(project) : slide.mediaUrl;
  const dynamicTitle = isProjectSlide && project ? String(project.title || '').trim() : slide.title;
  const dynamicButtonLink = isProjectSlide && project ? projectLink(project) : slide.buttonLink;
  return {
    ...slide,
    title: dynamicTitle,
    description: isProjectSlide ? '' : slide.description,
    mediaType: isProjectSlide ? inferMediaType(null, 'image', dynamicMediaUrl) : slide.mediaType,
    mediaUrl: dynamicMediaUrl,
    buttonText: isProjectSlide ? 'Layihəyə Bax →' : slide.buttonText,
    buttonLink: dynamicButtonLink,
    slide_type: slide.slideType,
    project_id: slide.projectId,
    media_type: isProjectSlide ? inferMediaType(null, 'image', dynamicMediaUrl) : slide.mediaType,
    media_url: dynamicMediaUrl,
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
    button_text: isProjectSlide ? 'Layihəyə Bax →' : slide.buttonText,
    button_link: dynamicButtonLink,
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

  if (adminView || slides.length) {
    return res.json(slides.map(serializeHeroSlide));
  }

  const featuredProjects = await prisma.project.findMany({
    where: { featuredInHero: true },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
  });
  return res.json(featuredProjects
    .map(projectToHeroSlide)
    .filter((slide) => slide.title && slide.mediaUrl)
    .map(serializeHeroSlide));
}));

router.post('/', authenticate, authorize('admin'), upload.single('media'), asyncHandler(async (req, res) => {
  const uploadedUrl = await uploadHeroFileWithFallback(req.file);
  const data = await normalizePayload(req.body, uploadedUrl, req.file);
  if (data.slideType === 'project' && !data.projectId) return res.status(400).json({ message: 'Project slide requires a project.' });
  if (!data.title) return res.status(400).json({ message: 'Title is required.' });
  if (!data.mediaUrl) return res.status(400).json({ message: 'Media URL, upload, or project image is required.' });
  const created = await prisma.heroSlide.create({ data, include: { project: true } });
  res.status(201).json(serializeHeroSlide(created));
}));

router.put('/:id', authenticate, authorize('admin'), upload.single('media'), asyncHandler(async (req, res) => {
  const existing = await prisma.heroSlide.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: 'Hero slide not found.' });
  const uploadedUrl = await uploadHeroFileWithFallback(req.file);
  const data = await normalizePayload(req.body, uploadedUrl, req.file, existing);
  if (data.slideType === 'project' && !data.projectId) return res.status(400).json({ message: 'Project slide requires a project.' });
  if (!data.title) return res.status(400).json({ message: 'Title is required.' });
  if (!data.mediaUrl) return res.status(400).json({ message: 'Media URL, upload, or project image is required.' });
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
