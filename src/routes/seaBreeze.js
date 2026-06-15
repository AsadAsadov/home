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
const mediaFields = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }, { name: 'media', maxCount: 8 }]);

const bool = (v, fb = true) => (v === undefined || v === null || v === '' ? fb : ['true', '1', 'yes', 'on'].includes(String(v).toLowerCase()));
const int = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const str = (v, fb = '') => String(v ?? fb).trim();
const isVideo = (url = '', file) => file?.mimetype?.startsWith('video/') || /\.(mp4|webm|mov)(\?|#|$)/i.test(String(url));
async function up(file) { return file ? uploadToGalleryBucket(file) : null; }
function file(req, name) { return Array.isArray(req.files?.[name]) ? req.files[name][0] : null; }
function listFile(req) { return Object.values(req.files || {}).flat()[0] || null; }
function orderBy() { return [{ sortOrder: 'asc' }, { id: 'asc' }]; }

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

    for (const section of seabreezeDefaultContent) {
      const slug = str(section.slug || section.sectionKey);
      if (!slug) continue;
      const duplicate = await tx.seaBreezeSection.findFirst({ where: { sectionKey: slug } });
      if (duplicate) continue;
      await tx.seaBreezeSection.create({
        data: {
          sectionKey: slug,
          title: section.title,
          content: section.content || '',
          facts: section.facts || [],
          sortOrder: section.sortOrder,
          isActive: section.isActive !== false,
        },
      });
      seededCount += 1;
    }
  });
  if (seededCount > 0) console.log('[seabreeze] default sections seeded:', seededCount);
}

function heroJson(x) { return { ...x, media_type: x.mediaType, image_url: x.imageUrl, video_url: x.videoUrl, cta_text: x.ctaText, cta_link: x.ctaLink, sort_order: x.sortOrder, is_active: x.isActive }; }
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
  const imageUrl = await up(file(req, 'image')) || str(req.body.image_url || req.body.imageUrl);
  const videoUrl = await up(file(req, 'video')) || str(req.body.video_url || req.body.videoUrl);
  const created = await prisma.seaBreezeHeroSlide.create({ data: { title: str(req.body.title), subtitle: str(req.body.subtitle), mediaType: str(req.body.media_type || req.body.mediaType, videoUrl ? 'video' : 'image'), imageUrl, videoUrl, ctaText: str(req.body.cta_text || req.body.ctaText, 'Layihələrə bax'), ctaLink: str(req.body.cta_link || req.body.ctaLink, '/projects'), sortOrder: int(req.body.sort_order || req.body.sortOrder), isActive: bool(req.body.is_active ?? req.body.isActive) } });
  res.status(201).json(heroJson(created));
}));
router.put('/hero-slides/:id', adminOnly, mediaFields, asyncHandler(async (req, res) => {
  const old = await prisma.seaBreezeHeroSlide.findUnique({ where: { id: int(req.params.id) } }); if (!old) return res.status(404).json({ message: 'Not found' });
  const imageUrl = await up(file(req, 'image')) || str(req.body.image_url || req.body.imageUrl, old.imageUrl || '');
  const videoUrl = await up(file(req, 'video')) || str(req.body.video_url || req.body.videoUrl, old.videoUrl || '');
  const row = await prisma.seaBreezeHeroSlide.update({ where: { id: old.id }, data: { title: str(req.body.title, old.title), subtitle: str(req.body.subtitle, old.subtitle || ''), mediaType: str(req.body.media_type || req.body.mediaType, old.mediaType), imageUrl, videoUrl, ctaText: str(req.body.cta_text || req.body.ctaText, old.ctaText || ''), ctaLink: str(req.body.cta_link || req.body.ctaLink, old.ctaLink || ''), sortOrder: int(req.body.sort_order || req.body.sortOrder, old.sortOrder), isActive: bool(req.body.is_active ?? req.body.isActive, old.isActive) } });
  res.json(heroJson(row));
}));
router.patch('/hero-slides/:id/toggle', adminOnly, asyncHandler(async (req, res) => { const old = await prisma.seaBreezeHeroSlide.findUnique({ where: { id: int(req.params.id) } }); const row = await prisma.seaBreezeHeroSlide.update({ where: { id: old.id }, data: { isActive: bool(req.body.is_active ?? req.body.isActive, !old.isActive) } }); res.json(heroJson(row)); }));
router.delete('/hero-slides/:id', adminOnly, asyncHandler(async (req, res) => { await prisma.seaBreezeHeroSlide.delete({ where: { id: int(req.params.id) } }); res.json({ success: true }); }));

router.get('/sections', asyncHandler(async (req, res) => {
  await seedDefaultSectionsIfEmpty();
  const admin = req.query.admin === '1' || req.query.admin === 'true';
  const rows = await prisma.seaBreezeSection.findMany({ where: admin ? undefined : { isActive: true }, orderBy: orderBy() });
  res.json(rows.map(sectionJson));
}));
router.post('/sections', adminOnly, mediaFields, asyncHandler(async (req, res) => {
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
      sortOrder: int(req.body.sort_order || req.body.sortOrder),
      isActive: bool(req.body.is_active ?? req.body.isActive),
    },
  });
  res.status(201).json(sectionJson(row));
}));
router.put('/sections/reorder', adminOnly, asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.order) ? req.body.order : [];
  await prisma.$transaction(items.map((it, i) => prisma.seaBreezeSection.update({ where: { id: int(it.id) }, data: { sortOrder: i + 1 } })));
  res.json({ success: true });
}));
router.put('/sections/:id', adminOnly, mediaFields, asyncHandler(async (req, res) => {
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
  res.json(sectionJson(row));
}));
router.patch('/sections/:id/toggle', adminOnly, asyncHandler(async (req, res) => { const old = await prisma.seaBreezeSection.findUnique({ where: { id: int(req.params.id) } }); const row = await prisma.seaBreezeSection.update({ where: { id: old.id }, data: { isActive: bool(req.body.is_active ?? req.body.isActive, !old.isActive) } }); res.json(sectionJson(row)); }));
router.delete('/sections/:id', adminOnly, asyncHandler(async (req, res) => { await prisma.seaBreezeSection.delete({ where: { id: int(req.params.id) } }); res.json({ success: true }); }));

router.get('/gallery', asyncHandler(async (req, res) => { const admin = req.query.admin === '1' || req.query.admin === 'true'; const rows = await prisma.seaBreezeGallery.findMany({ where: admin ? undefined : { isActive: true }, orderBy: orderBy() }); res.json(rows.map(galleryJson)); }));
router.post('/gallery', adminOnly, mediaFields, asyncHandler(async (req, res) => { const f = listFile(req); const mediaUrl = await up(f) || str(req.body.media_url || req.body.mediaUrl); const row = await prisma.seaBreezeGallery.create({ data: { title: str(req.body.title), category: str(req.body.category), mediaType: str(req.body.media_type || req.body.mediaType, isVideo(mediaUrl, f) ? 'video' : 'image'), mediaUrl, thumbnailUrl: str(req.body.thumbnail_url || req.body.thumbnailUrl), sortOrder: int(req.body.sort_order || req.body.sortOrder), isActive: bool(req.body.is_active ?? req.body.isActive) } }); res.status(201).json(galleryJson(row)); }));
router.put('/gallery/:id', adminOnly, mediaFields, asyncHandler(async (req, res) => { const old = await prisma.seaBreezeGallery.findUnique({ where: { id: int(req.params.id) } }); if (!old) return res.status(404).json({ message: 'Not found' }); const f = listFile(req); const mediaUrl = await up(f) || str(req.body.media_url || req.body.mediaUrl, old.mediaUrl); const row = await prisma.seaBreezeGallery.update({ where: { id: old.id }, data: { title: str(req.body.title, old.title || ''), category: str(req.body.category, old.category || ''), mediaType: str(req.body.media_type || req.body.mediaType, old.mediaType || (isVideo(mediaUrl, f) ? 'video' : 'image')), mediaUrl, thumbnailUrl: str(req.body.thumbnail_url || req.body.thumbnailUrl, old.thumbnailUrl || ''), sortOrder: int(req.body.sort_order || req.body.sortOrder, old.sortOrder), isActive: bool(req.body.is_active ?? req.body.isActive, old.isActive) } }); res.json(galleryJson(row)); }));
router.patch('/gallery/:id/toggle', adminOnly, asyncHandler(async (req, res) => { const old = await prisma.seaBreezeGallery.findUnique({ where: { id: int(req.params.id) } }); const row = await prisma.seaBreezeGallery.update({ where: { id: old.id }, data: { isActive: bool(req.body.is_active ?? req.body.isActive, !old.isActive) } }); res.json(galleryJson(row)); }));
router.put('/gallery/reorder', adminOnly, asyncHandler(async (req, res) => { const items = Array.isArray(req.body.order) ? req.body.order : []; await prisma.$transaction(items.map((it, i) => prisma.seaBreezeGallery.update({ where: { id: int(it.id) }, data: { sortOrder: i + 1 } }))); res.json({ success: true }); }));
router.put('/hero-slides/reorder', adminOnly, asyncHandler(async (req, res) => { const items = Array.isArray(req.body.order) ? req.body.order : []; await prisma.$transaction(items.map((it, i) => prisma.seaBreezeHeroSlide.update({ where: { id: int(it.id) }, data: { sortOrder: i + 1 } }))); res.json({ success: true }); }));
router.delete('/gallery/:id', adminOnly, asyncHandler(async (req, res) => { await prisma.seaBreezeGallery.delete({ where: { id: int(req.params.id) } }); res.json({ success: true }); }));

module.exports = router;
