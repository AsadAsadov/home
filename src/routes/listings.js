const express = require('express');
const multer = require('multer');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const { assertValidListingImage, uploadListingImage } = require('../utils/supabaseStorage');

const router = express.Router();

const include = {
  user: { select: { id: true, fullname: true, email: true, role: true } },
  images: { orderBy: { sortOrder: 'asc' } },
};

const listingUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_LISTING_IMAGE_SIZE_BYTES || 15 * 1024 * 1024),
    files: Number(process.env.MAX_LISTING_IMAGES || 20),
  },
  fileFilter: (_req, file, cb) => {
    try {
      assertValidListingImage({ ...file, size: file.size || 0 });
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  },
});

function pagination(query) {
  const page = Math.max(Number.parseInt(query.page || '1', 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit || '20', 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

function parseExistingImageUrls(body) {
  const raw = body.existing_images ?? body.existingImages ?? body.images;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((url) => String(url || '').trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((url) => String(url || '').trim()).filter(Boolean);
  } catch (_error) {
    return String(raw).split(',').map((url) => url.trim()).filter(Boolean);
  }
  return [];
}

function listingFiles(req) {
  if (Array.isArray(req.files)) return req.files;
  if (!req.files) return [];
  return [...(req.files.images || []), ...(req.files.image || [])];
}

async function uploadListingFiles(files) {
  const urls = [];
  for (const file of files) {
    assertValidListingImage(file);
    urls.push(await uploadListingImage(file));
  }
  return urls;
}

function listingImageCreateMany(urls) {
  return urls.map((imageUrl, sortOrder) => ({ imageUrl, sortOrder }));
}

router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const where = q ? { OR: [
    { title: { contains: q, mode: 'insensitive' } },
    { projectName: { contains: q, mode: 'insensitive' } },
    { description: { contains: q, mode: 'insensitive' } },
  ] } : undefined;
  const { page, limit, skip, take } = pagination(req.query);
  const [data, total] = await Promise.all([
    prisma.listing.findMany({ where, orderBy: { createdAt: 'desc' }, include, skip, take }),
    prisma.listing.count({ where }),
  ]);
  res.json({ data, total, page, totalPages: Math.max(Math.ceil(total / limit), 1) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await prisma.listing.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  return res.json(data);
}));

router.post('/', authenticate, authorize('admin', 'user'), listingUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: Number(process.env.MAX_LISTING_IMAGES || 20) },
]), asyncHandler(async (req, res) => {
  const uploadedImageUrls = await uploadListingFiles(listingFiles(req));
  const imageUrls = [...uploadedImageUrls, ...parseExistingImageUrls(req.body), req.body.image_url ?? req.body.imageUrl].filter(Boolean);
  const data = compact(serializers.listing({ ...req.body, image_url: imageUrls[0] || req.body.image_url || req.body.imageUrl }, req));
  if (req.auth.role === 'user') data.userId = req.auth.id;
  if (!data.title) return res.status(400).json({ message: 'Listing title is required.' });

  const created = await prisma.listing.create({
    data: {
      ...data,
      images: imageUrls.length ? { create: listingImageCreateMany(imageUrls) } : undefined,
    },
    include,
  });
  res.status(201).json(created);
}));

router.put('/:id', authenticate, authorize('admin', 'user'), listingUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: Number(process.env.MAX_LISTING_IMAGES || 20) },
]), asyncHandler(async (req, res) => {
  const existing = await prisma.listing.findUnique({ where: { id: Number(req.params.id) }, include: { images: true } });
  if (!existing) return res.status(404).json({ message: 'Record not found.' });
  if (req.auth.role === 'user' && existing.userId !== req.auth.id) return res.status(403).json({ message: 'You do not have permission for this action.' });

  const uploadedImageUrls = await uploadListingFiles(listingFiles(req));
  const submittedExistingUrls = parseExistingImageUrls(req.body);
  const keepCurrentImages = !uploadedImageUrls.length && !submittedExistingUrls.length && !req.body.image_url && !req.body.imageUrl;
  const imageUrls = keepCurrentImages
    ? existing.images.sort((a, b) => a.sortOrder - b.sortOrder).map((img) => img.imageUrl)
    : [...uploadedImageUrls, ...submittedExistingUrls, req.body.image_url ?? req.body.imageUrl].filter(Boolean);

  const data = compact(serializers.listing({ ...req.body, image_url: imageUrls[0] || req.body.image_url || req.body.imageUrl }, req));
  if (req.auth.role === 'user') data.userId = req.auth.id;

  const updated = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.update({ where: { id: Number(req.params.id) }, data });
    if (!keepCurrentImages) {
      await tx.listingImage.deleteMany({ where: { listingId: listing.id } });
      if (imageUrls.length) {
        await tx.listingImage.createMany({
          data: imageUrls.map((imageUrl, sortOrder) => ({ listingId: listing.id, imageUrl, sortOrder })),
        });
      }
    }
    return tx.listing.findUnique({ where: { id: listing.id }, include });
  });
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin', 'user'), asyncHandler(async (req, res) => {
  const existing = await prisma.listing.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: 'Record not found.' });
  if (req.auth.role === 'user' && existing.userId !== req.auth.id) return res.status(403).json({ message: 'You do not have permission for this action.' });
  await prisma.listing.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
