const express = require('express');
const multer = require('multer');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const { assertValidListingImage, sanitizeText, uploadListingImage } = require('../utils/supabaseStorage');

const router = express.Router();

const include = {
  images: { orderBy: { sortOrder: 'asc' } },
};

const userSelect = {
  id: true,
  fullname: true,
  phone: true,
  email: true,
};

function normalizeListingStatus(value, fallback = 'pending') {
  const normalized = String(value || '').trim().toLowerCase();
  if (['approved', 'təsdiqlənib', 'tesdiqlenib'].includes(normalized)) return 'approved';
  if (['rejected', 'rədd edilib', 'redd edilib'].includes(normalized)) return 'rejected';
  if (['pending', 'gözləmədə', 'gozlemede'].includes(normalized)) return 'pending';
  return fallback;
}

function listingVisibilityWhere(req, baseWhere) {
  const clauses = [];
  if (baseWhere) clauses.push(baseWhere);
  const requestedStatus = normalizeListingStatus(req.query.status, null);
  if (req.auth?.role === 'admin') {
    if (requestedStatus) clauses.push({ status: requestedStatus });
  } else if (req.auth?.role === 'user') {
    if (requestedStatus) {
      clauses.push({ status: requestedStatus });
      clauses.push({ OR: [{ status: 'approved' }, { userId: toBigIntId(req.auth.id) }] });
    } else {
      clauses.push({ OR: [{ status: 'approved' }, { userId: toBigIntId(req.auth.id) }] });
    }
  } else {
    clauses.push({ status: 'approved' });
  }
  return clauses.length ? { AND: clauses } : undefined;
}

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
  'area',
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

function toBigIntId(value) {
  if (value === undefined || value === null || value === '') return undefined;
  try {
    const id = BigInt(value);
    return id > 0n ? id : undefined;
  } catch (_error) {
    return undefined;
  }
}

function sameId(a, b) {
  if (a === undefined || a === null || b === undefined || b === null) return false;
  return String(a) === String(b);
}

function listingSortValue(value, fallback = 0) {
  if (value === undefined || value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function inspectStringFields(value, path = 'data', fields = []) {
  if (typeof value === 'string') {
    fields.push({
      path,
      hasNullByte: value.includes('\0'),
      length: value.length,
      sanitizedLength: sanitizeText(value).length,
    });
    return fields;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectStringFields(item, `${path}[${index}]`, fields));
    return fields;
  }

  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
    for (const [key, childValue] of Object.entries(value)) {
      inspectStringFields(childValue, `${path}.${key}`, fields);
    }
  }

  return fields;
}

function logRecursiveStringFieldInspection(payload) {
  const fields = inspectStringFields(payload);
  const nullByteFields = fields.filter((field) => field.hasNullByte).map((field) => field.path);
  console.info('[listings] recursive string field inspection', {
    fields,
    nullByteFields,
  });
  return { fields, nullByteFields };
}

function inspectPayloadFields(payload) {
  const fields = Object.entries(payload).map(([key, value]) => ({
    key,
    type: typeof value,
    isBuffer: Buffer.isBuffer(value),
    hasNullByte: typeof value === 'string' ? value.includes('\0') : undefined,
  }));
  const bufferOrObjectFields = fields.filter((field) => field.isBuffer || field.type === 'object');

  for (const { key } of bufferOrObjectFields) {
    console.log('[listings] payload Buffer/Object field', { key, value: payload[key] });
  }

  return { fields, bufferOrObjectFields };
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


function summarizeUploadedFiles(files) {
  return files.map((file) => ({
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  }));
}

function compareListingFieldNames(body) {
  const pairs = [
    ['title', 'title'],
    ['listing_type', 'listingType'],
    ['property_category', 'propertyCategory'],
    ['project_name', 'projectName'],
    ['room_count', 'roomCount'],
    ['area', 'area'],
    ['floor_number', 'floorNumber'],
    ['floor_count', 'floorCount'],
    ['price', 'price'],
    ['description', 'description'],
  ];
  const comparison = {};
  for (const [snakeCase, camelCase] of pairs) {
    comparison[snakeCase] = {
      snakeCaseValue: body[snakeCase],
      camelCaseField: camelCase,
      camelCaseValue: body[camelCase],
      selectedValue: body[snakeCase] ?? body[camelCase],
    };
  }
  return comparison;
}

function listingImageCreateMany(urls) {
  return urls.map((imageUrl, sortOrder) => ({ imageUrl, sortOrder }));
}


async function attachListingUsers(listings) {
  const rows = Array.isArray(listings) ? listings : [listings].filter(Boolean);
  rows.forEach((listing) => { listing.user = null; });
  const ids = [...new Set(rows.map((listing) => Number(listing.userId)).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) return listings;
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: userSelect });
  const byId = new Map(users.map((user) => [String(user.id), user]));
  rows.forEach((listing) => {
    listing.user = byId.get(String(listing.userId)) || null;
  });
  return listings;
}

function orderedListingRows(rows) {
  return [...rows].sort((a, b) => (listingSortValue(a.displayOrder, listingSortValue(a.id)) - listingSortValue(b.displayOrder, listingSortValue(b.id))) || (listingSortValue(a.id) - listingSortValue(b.id)));
}

function parseListingOrder(body) {
  const raw = Array.isArray(body?.order) ? body.order : (Array.isArray(body?.listings) ? body.listings : []);
  return raw
    .map((item, index) => ({
      id: toBigIntId(typeof item === 'object' ? item.id : item),
      displayOrder: Number.parseInt(typeof item === 'object' && item.displayOrder != null ? item.displayOrder : index + 1, 10),
    }))
    .filter((item) => item.id !== undefined && Number.isInteger(item.displayOrder));
}

router.get('/', optionalAuthenticate, asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const searchWhere = q ? { OR: [
    { title: { contains: q, mode: 'insensitive' } },
    { projectName: { contains: q, mode: 'insensitive' } },
    { description: { contains: q, mode: 'insensitive' } },
  ] } : undefined;
  const where = listingVisibilityWhere(req, searchWhere);
  const { page, limit, skip, take } = pagination(req.query);
  const [data, total] = await Promise.all([
    prisma.listing.findMany({ where, orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], include, skip, take }),
    prisma.listing.count({ where }),
  ]);
  await attachListingUsers(data);
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
  await attachListingUsers(data);
  res.json({ ok: true, data: orderedListingRows(data) });
}));


router.patch('/:id/approve', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid listing ID.' });
  const updated = await prisma.listing.update({
    where: { id },
    data: { status: 'approved', approvedAt: new Date(), approvedBy: toBigIntId(req.auth.id) },
    include,
  });
  await attachListingUsers(updated);
  res.json(updated);
}));

router.patch('/:id/reject', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid listing ID.' });
  const updated = await prisma.listing.update({
    where: { id },
    data: { status: 'rejected', approvedAt: null, approvedBy: null },
    include,
  });
  await attachListingUsers(updated);
  res.json(updated);
}));

router.post('/:id/view', optionalAuthenticate, asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid listing ID.' });
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing || existing.status !== 'approved') return res.status(404).json({ message: 'Record not found.' });
  const sessionKey = `viewed_listing_${id}`;
  if (req.body?.sessionCounted || req.headers['x-besthome-view-session'] === sessionKey) {
    return res.json({ counted: false, viewCount: existing.viewCount });
  }
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
  const userAgent = req.headers['user-agent'] || null;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.listingView.create({ data: { listingId: id, userId: toBigIntId(req.auth?.id), ipAddress: ip, userAgent } });
    return tx.listing.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  });
  res.json({ counted: true, viewCount: updated.viewCount, sessionKey });
}));

router.get('/:id', optionalAuthenticate, asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid listing ID.' });
  const data = await prisma.listing.findUnique({ where: { id }, include });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  const canSee = data.status === 'approved' || req.auth?.role === 'admin' || (req.auth?.role === 'user' && sameId(data.userId, req.auth.id));
  if (!canSee) return res.status(404).json({ message: 'Record not found.' });
  await attachListingUsers(data);
  return res.json(data);
}));

router.post('/', authenticate, authorize('admin', 'user'), listingUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: Number(process.env.MAX_LISTING_IMAGES || 20) },
]), asyncHandler(async (req, res) => {
  try {
    const files = listingFiles(req);
    const fileOriginalNames = files.map((file) => file.originalname);
    const fileSummary = summarizeUploadedFiles(files);
    console.log('BODY', req.body);
    console.log('FILES', req.files);
    console.log('[listings] files summary', fileSummary);
    console.log('[listings] field name comparison', compareListingFieldNames(req.body));
    fileOriginalNames.forEach((originalname) => console.log('file.originalname', originalname));
    const uploadedImageUrls = await uploadListingFiles(files);
    const rawImageUrls = [...uploadedImageUrls, ...parseExistingImageUrls(req.body), req.body.image_url ?? req.body.imageUrl].filter(Boolean);
    logListingInputSanitization(req.body, rawImageUrls);
    const imageUrls = sanitizeImageUrls(rawImageUrls);
    const data = sanitizeListingPayload(compact(serializers.listing({ ...req.body, image_url: imageUrls[0] || req.body.image_url || req.body.imageUrl }, req)));
    data.userId = toBigIntId(req.auth.id);
    data.status = req.auth.role === 'admin' ? normalizeListingStatus(req.body.status, 'approved') : 'pending';
    if (data.status === 'approved') {
      data.approvedAt = new Date();
      data.approvedBy = toBigIntId(req.auth.id);
    }
    if (!data.title) return res.status(400).json({ message: 'Listing title is required.' });

    const listingImagesPayload = listingImageCreateMany(imageUrls);
    const payload = { ...data };
    const createArgs = { data: payload, include };
    console.log('PRISMA PAYLOAD', payload);
    console.log(JSON.stringify(payload, (_key, value) => (typeof value === 'bigint' ? value.toString() : value), 2));
    console.log('image_url', payload.imageUrl);
    console.log('listing_images payload', listingImagesPayload);
    console.info('[listings] prisma payload', createArgs);
    const payloadInspection = inspectPayloadFields(payload);
    console.info('[listings] payload field inspection', payloadInspection);
    logRecursiveStringFieldInspection({ listing: payload, images: listingImagesPayload });

    let listing;
    try {
      listing = await prisma.listing.create(createArgs);
      console.log('LISTING INSERT OK', listing);
    } catch (error) {
      console.error('[listings] prisma.listing.create error details', {
        code: error.code,
        meta: error.meta,
        stack: error.stack,
      });
      throw error;
    }

    if (listingImagesPayload.length) {
      try {
        const result = await prisma.listingImage.createMany({
          data: listingImagesPayload.map((image) => ({ ...image, listingId: listing.id })),
        });
        console.log('LISTING_IMAGES INSERT OK', result);
      } catch (error) {
        console.error('[listings] prisma.listingImage.createMany error details', {
          code: error.code,
          meta: error.meta,
          stack: error.stack,
        });
        throw error;
      }
    } else {
      console.log('LISTING_IMAGES INSERT OK', { count: 0 });
    }

    const savedListing = await prisma.listing.findUnique({ where: { id: listing.id }, include });
    await attachListingUsers(savedListing || listing);
    return res.status(201).json(savedListing || listing);
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
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid listing ID.' });
  const existing = await prisma.listing.findUnique({ where: { id }, include: { images: true } });
  if (!existing) return res.status(404).json({ message: 'Record not found.' });
  if (req.auth.role === 'user' && !sameId(existing.userId, req.auth.id)) return res.status(403).json({ message: 'You do not have permission for this action.' });

  const uploadedImageUrls = await uploadListingFiles(listingFiles(req));
  const submittedExistingUrls = parseExistingImageUrls(req.body);
  const keepCurrentImages = !uploadedImageUrls.length && !submittedExistingUrls.length && !req.body.image_url && !req.body.imageUrl;
  const imageUrls = keepCurrentImages
    ? sanitizeImageUrls(existing.images.sort((a, b) => a.sortOrder - b.sortOrder).map((img) => img.imageUrl))
    : sanitizeImageUrls([...uploadedImageUrls, ...submittedExistingUrls, req.body.image_url ?? req.body.imageUrl].filter(Boolean));

  const data = sanitizeListingPayload(compact(serializers.listing({ ...req.body, image_url: imageUrls[0] || req.body.image_url || req.body.imageUrl }, req)));
  if (req.auth.role === 'user') {
    data.userId = toBigIntId(req.auth.id);
    delete data.status;
    delete data.approvedAt;
    delete data.approvedBy;
  } else if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
    data.status = normalizeListingStatus(req.body.status, existing.status || 'pending');
    data.approvedAt = data.status === 'approved' ? (existing.approvedAt || new Date()) : null;
    data.approvedBy = data.status === 'approved' ? toBigIntId(req.auth.id) : null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    console.info('[listings] prisma.listing.update', { where: { id }, data });
    const listing = await tx.listing.update({ where: { id }, data });
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
  await attachListingUsers(updated);
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin', 'user'), asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid listing ID.' });
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Record not found.' });
  if (req.auth.role === 'user' && !sameId(existing.userId, req.auth.id)) return res.status(403).json({ message: 'You do not have permission for this action.' });
  await prisma.listing.delete({ where: { id } });
  res.status(204).send();
}));

module.exports = router;
