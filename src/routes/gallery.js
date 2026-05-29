const express = require('express');
const prisma = require('../prisma');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { normalizeVideo } = require('../utils/media');
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

function payload(req) {
  const { body } = req;
  const files = mediaFiles(req);
  const uploadedUrls = files.map((file) => `/uploads/${file.filename}`);
  const firstVideoUpload = files.find((file) => file.mimetype.startsWith('video/'));
  const imageUploads = files.filter((file) => file.mimetype.startsWith('image/')).map((file) => `/uploads/${file.filename}`);
  const mediaType = body.media_type ?? body.mediaType ?? body.type ?? (firstVideoUpload ? 'video' : 'image');
  const images = [...imageUploads, ...parseImages(body.images), ...parseImages(body.existing_images ?? body.existingImages), body.image_url ?? body.imageUrl].filter(Boolean);
  const originalVideoUrl = firstVideoUpload ? `/uploads/${firstVideoUpload.filename}` : (body.video_url ?? body.videoUrl ?? body.url);
  const normalized = mediaType === 'video' && originalVideoUrl ? normalizeVideo(originalVideoUrl) : {};
  const imageUrl = mediaType === 'image' ? (images[0] || uploadedUrls[0] || null) : (body.image_url ?? body.imageUrl ?? null);
  const thumbnailUrl = body.thumbnail_url ?? body.thumbnailUrl ?? normalized.thumbnailUrl ?? imageUrl ?? null;

  return Object.fromEntries(Object.entries({
    title: body.title,
    description: body.description ?? body.desc,
    mediaType,
    imageUrl,
    images: images.length ? images : undefined,
    videoUrl: mediaType === 'video' ? (normalized.videoUrl ?? originalVideoUrl) : undefined,
    thumbnailUrl,
  }).filter(([, v]) => v !== undefined));
}

router.get('/', asyncHandler(async (_req, res) => {
  const data = await prisma.gallery.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(data);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await prisma.gallery.findUnique({ where: { id: Number(req.params.id) } });
  if (!data) return res.status(404).json({ message: 'Gallery item not found.' });
  return res.json(data);
}));

router.post('/', authenticate, authorize('admin', 'employee'), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 25 },
  { name: 'video', maxCount: 1 },
]), asyncHandler(async (req, res) => {
  const created = await prisma.gallery.create({ data: payload(req) });
  res.status(201).json(created);
}));

router.put('/:id', authenticate, authorize('admin', 'employee'), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 25 },
  { name: 'video', maxCount: 1 },
]), asyncHandler(async (req, res) => {
  const updated = await prisma.gallery.update({ where: { id: Number(req.params.id) }, data: payload(req) });
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin', 'employee'), asyncHandler(async (req, res) => {
  await prisma.gallery.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
