const express = require('express');
const multer = require('multer');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const { assertValidListingImage, sanitizeText, uploadListingImage } = require('../utils/supabaseStorage');

const router = express.Router();

const include = {
  user: { select: { id: true, fullname: true, email: true, role: true } },
  images: { orderBy: { sortOrder: 'asc' } },
};

const LISTING_INPUT_LOG_FIELDS = [
  ['title', (body) => body.title],
  ['description', (body) => body.description],
  ['project_name', (body) => body.project_name ?? body.projectName],
  ['listing_type', (body) => body.listing_type ?? body.listingType],
  ['property_category', (body) => body.property_category ?? body.propertyCategory],
  ['image_url', (body) => body.image_url ?? body.imageUrl],
  ['area', (body) => body.area],
  ['floor_count', (body) => body.floor_count ?? body.floorCount],
  ['floor_number', (body) => body.floor_number ?? body.floorNumber],
];

const LISTING_TEXT_PAYLOAD_FIELDS = [
  'title',
  'description',
  'projectName',
  'listingType',
  'propertyCategory',
  'imageUrl',
  'floorCount',
];

function sanitizeLoggedValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeLoggedValue);
  return sanitizeText(value);
}

function containsNullByte(value) {
  if (Array.isArray(value)) return value.some(containsNullByte);
  return typeof value === 'string' && value.includes('\0');
}

function stringNullByteFields(payload) {
  const fields = [];
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string') {
      const hasNull = value.includes('\0');
      console.log(key, hasNull);
      if (hasNull) fields.push(key);
    }
  }
  return fields;
}

function logListingInputSanitization(body, imageUrls = []) {
  const fieldLogs = LISTING_INPUT_LOG_FIELDS.map(([field, getter]) => {
    const originalValue = field === 'image_url' && imageUrls.length ? imageUrls : getter(body);
    const sanitizedValue = sanitizeLoggedValue(originalValue);
    return {
      field,
      originalValue,
      sanitizedValue,
      nullByteFound: containsNullByte(originalValue),
    };
  });
  const nullByteFields = fieldLogs.filter((item) => item.nullByteFound).map((item) => item.field);
  console.info('[listings] input sanitization before prisma.listing.create', {
    fields: fieldLogs,
    nullByteFields,
  });
  return { fieldLogs, nullByteFields };
}

function sanitizeListingPayload(data) {
  const sanitized = { ...data };
  const fieldLogs = [];
  for (const field of LISTING_TEXT_PAYLOAD_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(sanitized, field)) continue;
    const originalValue = sanitized[field];
    const sanitizedValue = sanitizeText(originalValue);
    sanitized[field] = sanitizedValue;
    fieldLogs.push({
      field,
      originalValue,
      sanitizedValue,
      nullByteFound: containsNullByte(originalValue),
    });
  }
  console.info('[listings] prisma payload text sanitization', {
    fields: fieldLogs,
    nullByteFields: fieldLogs.filter((item) => item.nullByteFound).map((item) => item.field),
  });
  return sanitized;
}

function sanitizeImageUrls(imageUrls) {
  const logs = imageUrls.map((originalValue, index) => ({
    index,
    originalValue,
    sanitizedValue: sanitizeText(originalValue),
    nullByteFound: containsNullByte(originalValue),
  }));
  console.info('[listings] image_url sanitization', {
    fields: logs,
    nullByteIndexes: logs.filter((item) => item.nullByteFound).map((item) => item.index),
  });
  return logs.map((item) => item.sanitizedValue).filter(Boolean);
}


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
  console.info('[listings] upload start', { fileCount: files.length });
  for (const [index, file] of files.entries()) {
    assertValidListingImage(file);
    console.log('file.originalname', file.originalname);
    console.info('[listings] upload start', {
      index,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    const publicUrl = await uploadListingImage(file);
    console.info('[listings] upload result', { index, originalname: file.originalname, publicUrl });
    console.info('[listings] public URL result', { index, publicUrl });
    urls.push(publicUrl);
  }
  return urls;
}

function logListingApiError(error) {
  console.error('[listings] real error', {
    message: error.message,
    code: error.code,
    meta: error.meta,
    stack: error.stack,
  });
}

function listingImageCreateMany(urls) {
  return urls.map((imageUrl, sortOrder) => ({ imageUrl, sortOrder }));
}

function orderedListingRows(rows) {
  return [...rows].sort((a, b) => (a.displayOrder ?? a.id) - (b.displayOrder ?? b.id) || a.id - b.id);
}

function parseListingOrder(body) {
  const raw = Array.isArray(body?.order) ? body.order : (Array.isArray(body?.listings) ? body.listings : []);
  return raw
    .map((item, index) => ({
      id: Number.parseInt(typeof item === 'object' ? item.id : item, 10),
      displayOrder: Number.parseInt(typeof item === 'object' && item.displayOrder != null ? item.displayOrder : index + 1, 10),
    }))
    .filter((item) => Number.isInteger(item.id) && item.id > 0 && Number.isInteger(item.displayOrder));
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
    prisma.listing.findMany({ where, orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], include, skip, take }),
    prisma.listing.count({ where }),
  ]);
  res.json({ data: orderedListingRows(data), total, page, totalPages: Math.max(Math.ceil(total / limit), 1) });
}));

router.put('/reorder', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const items = parseListingOrder(req.body);
  if (!items.length) return res.status(400).json({ message: 'Listing order array is required.' });

  const uniqueIds = new Set(items.map((item) => item.id));
  if (uniqueIds.size !== items.length) return res.status(400).json({ message: 'Listing IDs must be unique.' });

  await prisma.$transaction(items.map((item) => (
    prisma.listing.update({ where: { id: item.id }, data: { displayOrder: item.displayOrder } })
  )));

  const data = await prisma.listing.findMany({ orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], include });
  res.json({ ok: true, data: orderedListingRows(data) });
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
  try {
    const files = listingFiles(req);
    const fileOriginalNames = files.map((file) => file.originalname);
    fileOriginalNames.forEach((originalname) => console.log('file.originalname', originalname));
    const uploadedImageUrls = await uploadListingFiles(files);
    const rawImageUrls = [...uploadedImageUrls, ...parseExistingImageUrls(req.body), req.body.image_url ?? req.body.imageUrl].filter(Boolean);
    logListingInputSanitization(req.body, rawImageUrls);
    const imageUrls = sanitizeImageUrls(rawImageUrls);
    const data = sanitizeListingPayload(compact(serializers.listing({ ...req.body, image_url: imageUrls[0] || req.body.image_url || req.body.imageUrl }, req)));
    if (req.auth.role === 'user') data.userId = req.auth.id;
    if (!data.title) return res.status(400).json({ message: 'Listing title is required.' });

    const listingImagesPayload = listingImageCreateMany(imageUrls);
    const payload = {
      ...data,
      images: imageUrls.length ? { create: listingImagesPayload } : undefined,
    };
    const createArgs = { data: payload, include };
    console.log(JSON.stringify(payload, null, 2));
    const nullByteFields = stringNullByteFields(payload);
    console.log('image_url', payload.imageUrl);
    console.log('listing_images payload', listingImagesPayload);
    console.info('[listings] prisma payload', createArgs);
    console.info('[listings] prisma.listing.create skipped for debug', createArgs);

    return res.json({
      payload,
      nullByteFields,
      fileOriginalNames,
      image_url: payload.imageUrl,
      listing_images: listingImagesPayload,
      createArgs,
    });
  } catch (error) {
    logListingApiError(error);
    return res.status(500).json({
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
  }
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
    ? sanitizeImageUrls(existing.images.sort((a, b) => a.sortOrder - b.sortOrder).map((img) => img.imageUrl))
    : sanitizeImageUrls([...uploadedImageUrls, ...submittedExistingUrls, req.body.image_url ?? req.body.imageUrl].filter(Boolean));

  const data = sanitizeListingPayload(compact(serializers.listing({ ...req.body, image_url: imageUrls[0] || req.body.image_url || req.body.imageUrl }, req)));
  if (req.auth.role === 'user') data.userId = req.auth.id;

  const updated = await prisma.$transaction(async (tx) => {
    console.info('[listings] prisma.listing.update', { where: { id: Number(req.params.id) }, data });
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
