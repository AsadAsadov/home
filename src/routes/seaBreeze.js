const express = require('express');
const prisma = require('../lib/prisma');
const { createUpload } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadToGalleryBucket } = require('../utils/supabaseStorage');
const seabreezeDefaultContent = require('../data/seabreezeDefaultContent');

const router = express.Router();
const upload = createUpload('seabreeze');
const adminOnly = [authenticate, authorize('admin')];
const mediaFields = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }, { name: 'media', maxCount: 8 }]);

const bool = (v, fb = true) => (v === undefined || v === null || v === '' ? fb : ['true', '1', 'yes', 'on'].includes(String(v).toLowerCase()));
const int = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const clampInt = (v, fb, min, max) => Math.min(max, Math.max(min, int(v, fb)));
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);
const str = (v, fb = '') => String(v ?? fb).trim();
const isVideo = (url = '', file) => file?.mimetype?.startsWith('video/') || /\.(mp4|webm|mov)(\?|#|$)/i.test(String(url));
async function up(file) { return file ? uploadToGalleryBucket(file) : null; }
function file(req, name) { return Array.isArray(req.files?.[name]) ? req.files[name][0] : null; }
function listFile(req) { return file(req, 'media') || file(req, 'video') || file(req, 'image') || null; }
function orderBy() { return [{ sortOrder: 'asc' }, { id: 'asc' }]; }

async function nextSortOrder(model) {
  const last = await model.findFirst({ orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }], select: { sortOrder: true } });
  return Math.max(0, Number(last?.sortOrder || 0)) + 1;
}

async function normalizeSortOrder(model, where = undefined) {
  const rows = await model.findMany({ where, orderBy: orderBy(), select: { id: true } });
  await prisma.$transaction(rows.map((row, index) => model.update({ where: { id: row.id }, data: { sortOrder: index + 1 } })));
}

async function applySequentialOrder(model, orderedItems = []) {
  const requestedIds = orderedItems.map((item) => int(item.id)).filter(Boolean);
  const requested = await model.findMany({ where: { id: { in: requestedIds } }, orderBy: orderBy(), select: { id: true } });
  const requestedSet = new Set(requested.map((row) => row.id));
  const remainder = await model.findMany({ where: { id: { notIn: [...requestedSet] } }, orderBy: orderBy(), select: { id: true } });
  const sortedIds = requestedIds.filter((id) => requestedSet.has(id)).concat(remainder.map((row) => row.id));
  await prisma.$transaction(sortedIds.map((id, index) => model.update({ where: { id }, data: { sortOrder: index + 1 } })));
}

function missingDelegateResponse(res, delegateName) {
  console.error(`[seabreeze] Prisma delegate missing: ${delegateName}. Run npx prisma generate after migration.`);
  return res.status(500).json({
    success: false,
    message: 'Sea Breeze Prisma model is not available. Run npx prisma generate.',
  });
}

function ensureSeaBreezeSectionDelegate(res) {
  if (!prisma.seaBreezeSection) {
    return missingDelegateResponse(res, 'seaBreezeSection');
  }
  return null;
}

async function seedDefaultSectionsIfEmpty() {
  let seededCount = 0;
  await prisma.$transaction(async (tx) => {
    try {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(735327337)`;
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') console.warn('Sea Breeze seed lock skipped:', error.message);
    }

    const existingCount = await tx.seaBreezeSection.count();
    if (existingCount > 0) return;

    const defaultSections = seabreezeDefaultContent
      .map((section) => ({
        sectionKey: str(section.slug || section.sectionKey),
        title: section.title,
        content: section.content || '',
        facts: section.facts || [],
        sortOrder: section.sortOrder,
        isActive: section.isActive !== false,
      }))
      .filter((section) => section.sectionKey && section.title);

    if (defaultSections.length === 0) return;

    const result = await tx.seaBreezeSection.createMany({
      data: defaultSections,
      skipDuplicates: true,
    });
    seededCount = result.count;
  });
}

function heroJson(x) { return { ...x, media_type: x.mediaType, image_url: x.imageUrl, video_url: x.videoUrl, ctaText: x.ctaText || x.buttonText || '', ctaLink: x.ctaLink || x.buttonLink || '', cta_text: x.ctaText || x.buttonText || '', cta_link: x.ctaLink || x.buttonLink || '', durationSeconds: x.durationSeconds ?? 6, duration_seconds: x.durationSeconds ?? 6, sort_order: x.sortOrder, is_active: x.isActive }; }
function heroPayload(req, old = {}) {
  const imageFile = file(req, 'image');
  const videoFile = file(req, 'video');
  return Promise.all([up(imageFile), up(videoFile)]).then(([uploadedImage, uploadedVideo]) => {
    const imageUrl = uploadedImage || str(firstDefined(req.body.image_url, req.body.imageUrl), old.imageUrl || '');
    const videoUrl = uploadedVideo || str(firstDefined(req.body.video_url, req.body.videoUrl), old.videoUrl || '');
    const mediaType = str(firstDefined(req.body.media_type, req.body.mediaType), videoUrl && imageUrl ? 'image_video' : (videoUrl ? 'video' : (imageUrl ? 'image' : old.mediaType || 'image')));
    return {
      title: str(req.body.title, old.title || ''),
      subtitle: str(req.body.subtitle, old.subtitle || ''),
      mediaType,
      imageUrl,
      videoUrl,
      ctaText: str(firstDefined(req.body.cta_text, req.body.ctaText, req.body.button_text, req.body.buttonText), old.ctaText || ''),
      ctaLink: str(firstDefined(req.body.cta_link, req.body.ctaLink, req.body.button_link, req.body.buttonLink), old.ctaLink || ''),
      durationSeconds: clampInt(firstDefined(req.body.duration_seconds, req.body.durationSeconds), old.durationSeconds ?? 6, 2, 30),
      sortOrder: int(firstDefined(req.body.sort_order, req.body.sortOrder), old.sortOrder || 0),
      isActive: bool(req.body.is_active ?? req.body.isActive, old.isActive ?? true),
    };
  });
}
function sectionJson(x) { return { ...x, slug: x.sectionKey, image_url: x.imageUrl, video_url: x.videoUrl, section_key: x.sectionKey, facts: x.facts || [], sort_order: x.sortOrder, is_active: x.isActive }; }
function factsFromBody(value, fallback = []) {
  if (value === undefined) return fallback;
  if (Array.isArray(value)) return value.filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch (_) {}
  return String(value).split('\n').map((x) => x.trim()).filter(Boolean);
}
function sectionSlug(req, fallback = '') { return str(req.body.slug || req.body.section_key || req.body.sectionKey, fallback); }
function galleryJson(x) { return { ...x, media_type: x.mediaType, media_url: x.mediaUrl, thumbnail_url: x.thumbnailUrl, sort_order: x.sortOrder, is_active: x.isActive }; }

router.get('/hero-slides', asyncHandler(async (req, res) => {
  const admin = req.query.admin === '1' || req.query.admin === 'true';
  const rows = await prisma.seaBreezeHeroSlide.findMany({ where: admin ? undefined : { isActive: true }, orderBy: orderBy() });
  res.json(rows.map(heroJson));
}));
router.post('/hero-slides', adminOnly, mediaFields, asyncHandler(async (req, res) => {
  const created = await prisma.seaBreezeHeroSlide.create({ data: await heroPayload(req, { ctaText: 'Layihələrə bax', ctaLink: '/projects' }) });
  res.status(201).json(heroJson(created));
}));
router.put('/hero-slides/:id', adminOnly, mediaFields, asyncHandler(async (req, res) => {
  const old = await prisma.seaBreezeHeroSlide.findUnique({ where: { id: int(req.params.id) } }); if (!old) return res.status(404).json({ message: 'Not found' });
  const row = await prisma.seaBreezeHeroSlide.update({ where: { id: old.id }, data: await heroPayload(req, old) });
  res.json(heroJson(row));
}));
router.patch('/hero-slides/:id/toggle', adminOnly, asyncHandler(async (req, res) => { const old = await prisma.seaBreezeHeroSlide.findUnique({ where: { id: int(req.params.id) } }); const row = await prisma.seaBreezeHeroSlide.update({ where: { id: old.id }, data: { isActive: bool(req.body.is_active ?? req.body.isActive, !old.isActive) } }); res.json(heroJson(row)); }));
router.delete('/hero-slides/:id', adminOnly, asyncHandler(async (req, res) => { await prisma.seaBreezeHeroSlide.delete({ where: { id: int(req.params.id) } }); res.json({ success: true }); }));

router.get('/sections', asyncHandler(async (req, res) => {
  const missingDelegate = ensureSeaBreezeSectionDelegate(res);
  if (missingDelegate) return missingDelegate;
  await seedDefaultSectionsIfEmpty();
  const admin = req.query.admin === '1' || req.query.admin === 'true';
  const rows = await prisma.seaBreezeSection.findMany({ where: admin ? undefined : { isActive: true }, orderBy: orderBy() });
  res.json(rows.map(sectionJson));
}));
router.post('/sections', adminOnly, mediaFields, asyncHandler(async (req, res) => {
  const missingDelegate = ensureSeaBreezeSectionDelegate(res);
  if (missingDelegate) return missingDelegate;
  const slug = sectionSlug(req);
  if (!slug) return res.status(400).json({ message: 'slug tələb olunur' });
  const existing = await prisma.seaBreezeSection.findFirst({ where: { sectionKey: slug } });
  if (existing) return res.status(409).json({ message: 'Bu slug ilə bölmə artıq mövcuddur' });
  const row = await prisma.seaBreezeSection.create({
    data: {
      sectionKey: slug,
      title: str(req.body.title),
      content: str(req.body.content),
      imageUrl: await up(file(req, 'image')) || str(req.body.image_url || req.body.imageUrl),
      videoUrl: await up(file(req, 'video')) || str(req.body.video_url || req.body.videoUrl),
      facts: factsFromBody(req.body.facts, []),
      sortOrder: int(req.body.sort_order || req.body.sortOrder, await nextSortOrder(prisma.seaBreezeSection)),
      isActive: bool(req.body.is_active ?? req.body.isActive),
    },
  });
  await normalizeSortOrder(prisma.seaBreezeSection);
  res.status(201).json(sectionJson(row));
}));
router.put('/sections/reorder', adminOnly, asyncHandler(async (req, res) => {
  const missingDelegate = ensureSeaBreezeSectionDelegate(res);
  if (missingDelegate) return missingDelegate;
  const items = Array.isArray(req.body.order) ? req.body.order : [];
  await applySequentialOrder(prisma.seaBreezeSection, items);
  res.json({ success: true });
}));
router.put('/sections/:id', adminOnly, mediaFields, asyncHandler(async (req, res) => {
  const missingDelegate = ensureSeaBreezeSectionDelegate(res);
  if (missingDelegate) return missingDelegate;
  const old = await prisma.seaBreezeSection.findUnique({ where: { id: int(req.params.id) } });
  if (!old) return res.status(404).json({ message: 'Not found' });
  const slug = sectionSlug(req, old.sectionKey || '');
  const duplicate = await prisma.seaBreezeSection.findFirst({ where: { sectionKey: slug, NOT: { id: old.id } } });
  if (duplicate) return res.status(409).json({ message: 'Bu slug ilə bölmə artıq mövcuddur' });
  const row = await prisma.seaBreezeSection.update({
    where: { id: old.id },
    data: {
      sectionKey: slug,
      title: str(req.body.title, old.title),
      content: str(req.body.content, old.content || ''),
      imageUrl: await up(file(req, 'image')) || str(req.body.image_url || req.body.imageUrl, old.imageUrl || ''),
      videoUrl: await up(file(req, 'video')) || str(req.body.video_url || req.body.videoUrl, old.videoUrl || ''),
      facts: factsFromBody(req.body.facts, old.facts || []),
      sortOrder: int(req.body.sort_order || req.body.sortOrder, old.sortOrder),
      isActive: bool(req.body.is_active ?? req.body.isActive, old.isActive),
    },
  });
  await normalizeSortOrder(prisma.seaBreezeSection);
  res.json(sectionJson(row));
}));
router.patch('/sections/:id/toggle', adminOnly, asyncHandler(async (req, res) => { const missingDelegate = ensureSeaBreezeSectionDelegate(res); if (missingDelegate) return missingDelegate; const old = await prisma.seaBreezeSection.findUnique({ where: { id: int(req.params.id) } }); if (!old) return res.status(404).json({ message: 'Not found' }); const row = await prisma.seaBreezeSection.update({ where: { id: old.id }, data: { isActive: bool(req.body.is_active ?? req.body.isActive, !old.isActive) } }); await normalizeSortOrder(prisma.seaBreezeSection); res.json(sectionJson(row)); }));
router.delete('/sections/:id', adminOnly, asyncHandler(async (req, res) => { const missingDelegate = ensureSeaBreezeSectionDelegate(res); if (missingDelegate) return missingDelegate; await prisma.seaBreezeSection.delete({ where: { id: int(req.params.id) } }); await normalizeSortOrder(prisma.seaBreezeSection); res.json({ success: true }); }));

router.get('/gallery', asyncHandler(async (req, res) => { const admin = req.query.admin === '1' || req.query.admin === 'true'; const rows = await prisma.seaBreezeGallery.findMany({ where: admin ? undefined : { isActive: true }, orderBy: orderBy() }); res.json(rows.map(galleryJson)); }));
router.post('/gallery', adminOnly, mediaFields, asyncHandler(async (req, res) => { const mediaFile = listFile(req); const thumbnailFile = file(req, 'thumbnail') || (file(req, 'image') && file(req, 'video') ? file(req, 'image') : null); const mediaUrl = await up(mediaFile) || str(req.body.media_url || req.body.mediaUrl); const thumbnailUrl = await up(thumbnailFile) || str(req.body.thumbnail_url || req.body.thumbnailUrl); const row = await prisma.seaBreezeGallery.create({ data: { title: str(req.body.title), category: str(req.body.category), mediaType: str(req.body.media_type || req.body.mediaType, isVideo(mediaUrl, mediaFile) ? 'video' : 'image'), mediaUrl, thumbnailUrl, sortOrder: int(req.body.sort_order || req.body.sortOrder), isActive: bool(req.body.is_active ?? req.body.isActive) } }); res.status(201).json(galleryJson(row)); }));
router.put('/gallery/:id', adminOnly, mediaFields, asyncHandler(async (req, res) => { const old = await prisma.seaBreezeGallery.findUnique({ where: { id: int(req.params.id) } }); if (!old) return res.status(404).json({ message: 'Not found' }); const mediaFile = listFile(req); const thumbnailFile = file(req, 'thumbnail') || (file(req, 'image') && file(req, 'video') ? file(req, 'image') : null); const mediaUrl = await up(mediaFile) || str(req.body.media_url || req.body.mediaUrl, old.mediaUrl); const thumbnailUrl = await up(thumbnailFile) || str(req.body.thumbnail_url || req.body.thumbnailUrl, old.thumbnailUrl || ''); const row = await prisma.seaBreezeGallery.update({ where: { id: old.id }, data: { title: str(req.body.title, old.title || ''), category: str(req.body.category, old.category || ''), mediaType: str(req.body.media_type || req.body.mediaType, isVideo(mediaUrl, mediaFile) ? 'video' : old.mediaType || 'image'), mediaUrl, thumbnailUrl, sortOrder: int(req.body.sort_order || req.body.sortOrder, old.sortOrder), isActive: bool(req.body.is_active ?? req.body.isActive, old.isActive) } }); res.json(galleryJson(row)); }));
router.patch('/gallery/:id/toggle', adminOnly, asyncHandler(async (req, res) => { const old = await prisma.seaBreezeGallery.findUnique({ where: { id: int(req.params.id) } }); const row = await prisma.seaBreezeGallery.update({ where: { id: old.id }, data: { isActive: bool(req.body.is_active ?? req.body.isActive, !old.isActive) } }); res.json(galleryJson(row)); }));
router.put('/gallery/reorder', adminOnly, asyncHandler(async (req, res) => { const items = Array.isArray(req.body.order) ? req.body.order : []; await prisma.$transaction(items.map((it, i) => prisma.seaBreezeGallery.update({ where: { id: int(it.id) }, data: { sortOrder: i + 1 } }))); res.json({ success: true }); }));
router.put('/hero-slides/reorder', adminOnly, asyncHandler(async (req, res) => { const items = Array.isArray(req.body.order) ? req.body.order : []; await prisma.$transaction(items.map((it, i) => prisma.seaBreezeHeroSlide.update({ where: { id: int(it.id) }, data: { sortOrder: i + 1 } }))); res.json({ success: true }); }));
router.delete('/gallery/:id', adminOnly, asyncHandler(async (req, res) => { await prisma.seaBreezeGallery.delete({ where: { id: int(req.params.id) } }); res.json({ success: true }); }));

module.exports = router;
