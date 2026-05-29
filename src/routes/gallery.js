const express = require('express');
const prisma = require('../prisma');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { normalizeVideo } = require('../utils/media');
const router = express.Router();

function payload(body, file) {
  const mediaType = body.media_type ?? body.mediaType ?? body.type;
  const originalVideoUrl = body.video_url ?? body.videoUrl ?? body.url;
  const normalized = mediaType === 'video' && originalVideoUrl ? normalizeVideo(originalVideoUrl) : {};
  return Object.fromEntries(Object.entries({
    title: body.title,
    description: body.description ?? body.desc,
    mediaType,
    imageUrl: file ? `/uploads/${file.filename}` : (body.image_url ?? body.imageUrl),
    videoUrl: normalized.videoUrl ?? originalVideoUrl,
    thumbnailUrl: body.thumbnail_url ?? body.thumbnailUrl ?? normalized.thumbnailUrl,
  }).filter(([, v]) => v !== undefined));
}

router.get('/', asyncHandler(async (_req, res) => {
  const data = await prisma.gallery.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(data);
}));

router.post('/', authenticate, authorize('admin', 'employee'), upload.single('image'), asyncHandler(async (req, res) => {
  const created = await prisma.gallery.create({ data: payload(req.body, req.file) });
  res.status(201).json(created);
}));

router.put('/:id', authenticate, authorize('admin', 'employee'), upload.single('image'), asyncHandler(async (req, res) => {
  const updated = await prisma.gallery.update({ where: { id: Number(req.params.id) }, data: payload(req.body, req.file) });
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin', 'employee'), asyncHandler(async (req, res) => {
  await prisma.gallery.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
