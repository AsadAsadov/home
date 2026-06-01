const express = require('express');
const fs = require('fs/promises');
const prisma = require('../lib/prisma');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { normalizeVideo } = require('../utils/media');
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
  const originalVideoUrl = firstVideoUpload ? firstVideoUpload.url : (body.video_url ?? body.videoUrl ?? body.url);
  const normalized = mediaType === 'video' && originalVideoUrl ? normalizeVideo(originalVideoUrl) : {};
  const imageUrl = mediaType === 'image' ? (images[0] || uploadedUrls[0] || null) : (imageField ?? null);
  const mediaUrls = mediaType === 'video'
    ? [normalized.videoUrl ?? originalVideoUrl].filter(Boolean)
    : images;
  const thumbnailUrl = body.thumbnail_url ?? body.thumbnailUrl ?? normalized.thumbnailUrl ?? imageUrl ?? images[0] ?? null;

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
    preview: { objectPosition: `${mediaPositionX} ${mediaPositionY}`, updatesInstantly: true },
  };
}

function positiveInt(value, fallback, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

router.get('/', asyncHandler(async (req, res) => {
  const page = positiveInt(req.query.page, 1, 1000000);
  const limit = positiveInt(req.query.limit, 18, 100);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.gallery.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }], skip, take: limit }),
    prisma.gallery.count(),
  ]);
  res.json({ items: items.map(serializeGallery), total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
}));


router.put('/reorder', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const order = Array.isArray(req.body?.order) ? req.body.order : [];
  const normalized = order
    .map((item, index) => ({ id: Number(item.id), sortOrder: Number(item.sortOrder ?? item.sort_order ?? index + 1) }))
    .filter((item) => Number.isInteger(item.id) && item.id > 0);

  if (!normalized.length) return res.status(400).json({ message: 'Order payload is required.' });

  await prisma.$transaction(normalized.map((item, index) => prisma.gallery.update({
    where: { id: item.id },
    data: { sortOrder: index + 1 },
  })));

  const items = await prisma.gallery.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }] });
  res.json({ items: items.map(serializeGallery) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await prisma.gallery.findUnique({ where: { id: Number(req.params.id) } });
  if (!data) return res.status(404).json({ message: 'Gallery item not found.' });
  return res.json(serializeGallery(data));
}));

router.post('/', authenticate, authorize('admin'), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 25 },
  { name: 'video', maxCount: 1 },
]), asyncHandler(async (req, res) => {
  const data = await payload(req);
  if (!Number.isFinite(Number(data.sortOrder)) || Number(data.sortOrder) <= 0) {
    await prisma.gallery.updateMany({ data: { sortOrder: { increment: 1 } } });
    data.sortOrder = 1;
  }
  const created = await prisma.gallery.create({ data });
  res.status(201).json(serializeGallery(created));
}));

router.put('/:id', authenticate, authorize('admin'), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 25 },
  { name: 'video', maxCount: 1 },
]), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.gallery.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Gallery item not found.' });
  const updated = await prisma.gallery.update({ where: { id }, data: await payload(req, existing) });
  res.json(serializeGallery(updated));
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.gallery.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
