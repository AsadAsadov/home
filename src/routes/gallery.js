const express = require('express');
const fs = require('fs/promises');
const prisma = require('../lib/prisma');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { getYouTubeThumbnailFallbackUrl, getYouTubeThumbnailUrl, normalizeVideo } = require('../utils/media');
const { uploadToGalleryBucket } = require('../utils/supabaseStorage');
const router = express.Router();

function parseImages(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (_error) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function mediaFiles(req) {
  if (!req.files) return [];
  if (Array.isArray(req.files)) return req.files;
  return Object.values(req.files).flat();
}

const MEDIA_POSITION_X = new Set(['left', 'center', 'right']);
const MEDIA_POSITION_Y = new Set(['top', 'center', 'bottom']);

function firstNonBlank(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function toBool(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on', 'aktiv'].includes(String(value).trim().toLowerCase());
}

function normalizeMediaPosition(value, allowed, fallback = 'center') {
  const normalized = String(value || '').trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function localUploadUrl(file) {
  return file?.filename ? `/uploads/${file.filename}` : null;
}

async function removeLocalUploadedFile(file) {
  if (!file?.path) return;
  await fs.unlink(file.path).catch(() => {});
}

async function uploadGalleryFileWithFallback(file) {
  try {
    const publicUrl = await uploadToGalleryBucket(file);
    await removeLocalUploadedFile(file);
    return publicUrl;
  } catch (error) {
    console.warn('[gallery] Supabase Storage upload unavailable; using local upload fallback.', {
      file: file?.originalname,
      status: error.status,
      message: error.message,
    });
    return localUploadUrl(file);
  }
}

async function payload(req, existing = {}) {
  const { body } = req;
  const files = mediaFiles(req);
  const uploadedPairs = await Promise.all(files.map(async (file) => ({ file, url: await uploadGalleryFileWithFallback(file) })));
  const firstVideoUpload = uploadedPairs.find(({ file }) => file.mimetype.startsWith('video/'));
  const imageUploads = uploadedPairs.filter(({ file }) => file.mimetype.startsWith('image/')).map(({ url }) => url).filter(Boolean);
  const uploadedUrls = uploadedPairs.map(({ url }) => url).filter(Boolean);
  const mediaType = body.media_type ?? body.mediaType ?? body.type ?? (firstVideoUpload ? 'video' : 'image');
  const submittedImages = parseImages(body.images);
  const existingImages = parseImages(body.existing_images ?? body.existingImages);
  const imageField = body.image_url ?? body.imageUrl;
  const images = [...imageUploads, ...submittedImages, ...existingImages, imageField].filter(Boolean);
  const originalVideoUrl = firstVideoUpload ? firstVideoUpload.url : firstNonBlank(body.video_url, body.videoUrl, body.url);
  const normalized = mediaType === 'video' && originalVideoUrl ? normalizeVideo(originalVideoUrl) : {};
  const imageUrl = mediaType === 'image' ? (images[0] || uploadedUrls[0] || null) : (firstNonBlank(imageField) ?? null);
  const mediaUrls = mediaType === 'video'
    ? [normalized.videoUrl ?? originalVideoUrl].filter(Boolean)
    : images;
  const thumbnailUrl = firstNonBlank(body.thumbnail_url, body.thumbnailUrl, normalized.thumbnailUrl, imageUrl, images[0]) ?? null;
  const requestedFeatured = toBool(body.isFeatured ?? body.is_featured);

  return Object.fromEntries(Object.entries({
    title: body.title,
    description: body.description ?? body.desc,
    mediaType,
    imageUrl,
    images: images.length ? images : undefined,
    mediaUrls: mediaUrls.length ? mediaUrls : undefined,
    videoUrl: mediaType === 'video' ? (normalized.videoUrl ?? originalVideoUrl) : undefined,
    thumbnailUrl,
    mediaPositionX: normalizeMediaPosition(body.media_position_x ?? body.mediaPositionX ?? existing.mediaPositionX, MEDIA_POSITION_X),
    mediaPositionY: normalizeMediaPosition(body.media_position_y ?? body.mediaPositionY ?? existing.mediaPositionY, MEDIA_POSITION_Y),
    isFeatured: mediaType === 'video' ? (requestedFeatured ?? existing.isFeatured ?? false) : false,
    sortOrder: Number.isFinite(Number(body.sort_order ?? body.sortOrder)) ? Number(body.sort_order ?? body.sortOrder) : existing.sortOrder,
  }).filter(([, v]) => v !== undefined));
}

function serializeGallery(item) {
  if (!item) return item;
  const mediaPositionX = item.mediaPositionX || 'center';
  const mediaPositionY = item.mediaPositionY || 'center';
  return {
    ...item,
    mediaPositionX,
    mediaPositionY,
    media_position_x: mediaPositionX,
    media_position_y: mediaPositionY,
    objectPosition: `${mediaPositionX} ${mediaPositionY}`,
    sort_order: item.sortOrder ?? item.sort_order ?? 0,
    isFeatured: Boolean(item.isFeatured ?? item.is_featured),
    is_featured: Boolean(item.isFeatured ?? item.is_featured),
    thumbnailFallbackUrl: getYouTubeThumbnailFallbackUrl(item.videoUrl || item.video_url || ''),
    thumbnail_fallback_url: getYouTubeThumbnailFallbackUrl(item.videoUrl || item.video_url || ''),
    autoThumbnailUrl: getYouTubeThumbnailUrl(item.videoUrl || item.video_url || ''),
    auto_thumbnail_url: getYouTubeThumbnailUrl(item.videoUrl || item.video_url || ''),
    preview: { objectPosition: `${mediaPositionX} ${mediaPositionY}`, updatesInstantly: true },
  };
}

function positiveInt(value, fallback, max = 5000) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function isGallerySchemaUnavailable(error) {
  return ['P2021', 'P2022'].includes(error?.code) || /gallery|sort_order|is_featured/i.test(String(error?.message || ''));
}

function emptyGalleryResponse(req, extra = {}) {
  const page = positiveInt(req?.query?.page, 1, 1000000);
  const limit = positiveInt(req?.query?.limit, 1000, 5000);
  return { success: true, data: [], items: [], total: 0, page, limit, totalPages: 1, ...extra };
}

function unsetOtherFeaturedVideos(tx, keepId = null) {
  return tx.gallery.updateMany({
    where: {
      mediaType: 'video',
      isFeatured: true,
      ...(keepId ? { id: { not: keepId } } : {}),
    },
    data: { isFeatured: false },
  });
}

router.get('/', asyncHandler(async (req, res) => {
  const page = positiveInt(req.query.page, 1, 1000000);
  const limit = positiveInt(req.query.limit, 1000, 5000);
  const skip = (page - 1) * limit;
  try {
    const [items, total] = await Promise.all([
      prisma.gallery.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }], skip, take: limit }),
      prisma.gallery.count(),
    ]);
    res.json({ success: true, data: items.map(serializeGallery), items: items.map(serializeGallery), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    if (!isGallerySchemaUnavailable(error)) throw error;
    console.warn('[gallery] schema unavailable; returning empty gallery response.', { code: error.code, message: error.message });
    res.json(emptyGalleryResponse(req, { page, limit }));
  }
}));


router.put('/reorder', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const order = Array.isArray(req.body?.order) ? req.body.order : [];
  const normalized = order
    .map((item, index) => ({ id: Number(item.id), sortOrder: Number(item.sortOrder ?? item.sort_order ?? index + 1) }))
    .filter((item) => Number.isInteger(item.id) && item.id > 0);

  if (!normalized.length) return res.status(400).json({ message: 'Order payload is required.' });

  try {
    await prisma.$transaction(normalized.map((item, index) => prisma.gallery.update({
      where: { id: item.id },
      data: { sortOrder: index + 1 },
    })));

    const items = await prisma.gallery.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }] });
    res.json({ success: true, data: items.map(serializeGallery), items: items.map(serializeGallery) });
  } catch (error) {
    if (!isGallerySchemaUnavailable(error)) throw error;
    console.warn('[gallery] reorder skipped because schema is unavailable.', { code: error.code, message: error.message });
    res.json(emptyGalleryResponse(req));
  }
}));


router.post('/:id/hero', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const isFeatured = toBool(req.body?.isFeatured ?? req.body?.is_featured);
  if (isFeatured === undefined) return res.status(400).json({ message: 'isFeatured is required.' });

  try {
    const existing = await prisma.gallery.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Gallery item not found.' });
    if (existing.mediaType !== 'video') return res.status(400).json({ message: 'Yalnız video hero edilə bilər.' });

    const updated = await prisma.$transaction(async (tx) => {
      if (isFeatured === true) {
        await tx.gallery.updateMany({ where: { mediaType: 'video' }, data: { isFeatured: false } });
        return tx.gallery.update({ where: { id }, data: { isFeatured: true } });
      }
      return tx.gallery.update({ where: { id }, data: { isFeatured: false } });
    });

    res.json(serializeGallery(updated));
  } catch (error) {
    if (!isGallerySchemaUnavailable(error)) throw error;
    console.warn('[gallery] hero toggle skipped because schema is unavailable.', { code: error.code, message: error.message });
    res.json(emptyGalleryResponse(req));
  }
}));

router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const data = await prisma.gallery.findUnique({ where: { id: Number(req.params.id) } });
    if (!data) return res.status(404).json({ message: 'Gallery item not found.' });
    return res.json(serializeGallery(data));
  } catch (error) {
    if (!isGallerySchemaUnavailable(error)) throw error;
    console.warn('[gallery] detail unavailable; returning empty response.', { code: error.code, message: error.message });
    return res.json({ success: true, data: [] });
  }
}));

router.post('/', authenticate, authorize('admin'), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 25 },
  { name: 'video', maxCount: 1 },
]), asyncHandler(async (req, res) => {
  try {
    const data = await payload(req);
    const created = await prisma.$transaction(async (tx) => {
      if (data.isFeatured === true) await unsetOtherFeaturedVideos(tx);
      if (!Number.isFinite(Number(data.sortOrder)) || Number(data.sortOrder) <= 0) {
        await tx.gallery.updateMany({ data: { sortOrder: { increment: 1 } } });
        data.sortOrder = 1;
      }
      return tx.gallery.create({ data });
    });
    res.status(201).json(serializeGallery(created));
  } catch (error) {
    if (!isGallerySchemaUnavailable(error)) throw error;
    console.warn('[gallery] create skipped because schema is unavailable.', { code: error.code, message: error.message });
    res.json({ success: true, data: [] });
  }
}));

router.put('/:id', authenticate, authorize('admin'), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 25 },
  { name: 'video', maxCount: 1 },
]), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.gallery.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Gallery item not found.' });
    const data = await payload(req, existing);
    const updated = await prisma.$transaction(async (tx) => {
      if (data.isFeatured === true) await unsetOtherFeaturedVideos(tx, id);
      return tx.gallery.update({ where: { id }, data });
    });
    res.json(serializeGallery(updated));
  } catch (error) {
    if (!isGallerySchemaUnavailable(error)) throw error;
    console.warn('[gallery] update skipped because schema is unavailable.', { code: error.code, message: error.message });
    res.json({ success: true, data: [] });
  }
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    await prisma.gallery.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    if (!isGallerySchemaUnavailable(error)) throw error;
    console.warn('[gallery] delete skipped because schema is unavailable.', { code: error.code, message: error.message });
    res.json({ success: true, data: [] });
  }
}));

module.exports = router;
