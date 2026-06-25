const express = require('express');
const { createUpload } = require('../middleware/upload');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const { assertValidListingImage, sanitizeText, uploadListingImage } = require('../utils/supabaseStorage');
const { logUserActivity } = require('../utils/activity');
const {
  LISTING_CODE_MAX_RETRIES,
  LISTING_CODE_ERROR_RESPONSE,
  generateListingCode,
  isListingCodeCollision,
} = require('../utils/listingCode');
const { normalizeAzerbaijanPhone } = require('../utils/phone');
const { sendNewListingNotification, notificationErrorDetails } = require('../utils/notifications');
const { sendListingPendingEmail, sendListingApprovedEmail } = require('../utils/email');
const { createNotification, notifyAdmins } = require('../utils/inAppNotifications');

const router = express.Router();

const include = {
  images: { orderBy: { sortOrder: 'asc' } },
};

const userSelect = {
  id: true,
  fullname: true,
  phone: true,
  email: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
};

function normalizeListingStatus(value, fallback = 'pending') {
  const normalized = String(value || '').trim().toLowerCase();
  if (['approved', 'təsdiqlənib', 'tesdiqlenib'].includes(normalized)) return 'approved';
  if (['rejected', 'rədd edilib', 'redd edilib'].includes(normalized)) return 'rejected';
  if (['archived', 'arxiv', 'arxivdə', 'arxivde'].includes(normalized)) return 'archived';
  if (['pending', 'gözləmədə', 'gozlemede'].includes(normalized)) return 'pending';
  return fallback;
}


async function ensureListingOwnerPhone(req, res) {
  const user = await prisma.user.findUnique({ where: { id: Number(req.auth.id) }, select: { id: true, phone: true } });
  const normalizedPhone = normalizeAzerbaijanPhone(user?.phone);
  if (!normalizedPhone) {
    res.status(400).json({
      success: false,
      code: 'PHONE_REQUIRED',
      message: 'Elan yerləşdirmək üçün əlaqə nömrəsi tələb olunur.',
    });
    return null;
  }
  if (user.phone !== normalizedPhone) {
    await prisma.user.update({ where: { id: user.id }, data: { phone: normalizedPhone } });
  }
  return normalizedPhone;
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
  ['region_type', (body) => body.region_type ?? body.regionType],
  ['city', (body) => body.city],
  ['district', (body) => body.district],
  ['settlement', (body) => body.settlement],
  ['neighborhood', (body) => body.neighborhood],
  ['metro_station', (body) => body.metro_station ?? body.metroStation],
  ['street_address', (body) => body.street_address ?? body.streetAddress],
  ['latitude', (body) => body.latitude],
  ['longitude', (body) => body.longitude],
  ['listing_type', (body) => body.listing_type ?? body.listingType],
  ['property_category', (body) => body.property_category ?? body.propertyCategory],
  ['property_subtype', (body) => body.property_subtype ?? body.propertySubtype],
  ['owner_type', (body) => body.owner_type ?? body.ownerType],
  ['has_document', (body) => body.has_document ?? body.hasDocument],
  ['image_url', (body) => body.image_url ?? body.imageUrl],
  ['area', (body) => body.area],
  ['floor_count', (body) => body.floor_count ?? body.floorCount],
  ['floor_number', (body) => body.floor_number ?? body.floorNumber],
];

const LISTING_TEXT_PAYLOAD_FIELDS = [
  'title',
  'description',
  'projectName',
  'regionType',
  'city',
  'district',
  'settlement',
  'neighborhood',
  'metroStation',
  'streetAddress',
  'listingType',
  'propertyCategory',
  'propertySubtype',
  'ownerType',
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


const listingUpload = createUpload('elanlar/listings', {
  fileSize: Number(process.env.MAX_LISTING_IMAGE_SIZE_BYTES || 15 * 1024 * 1024),
  files: Number(process.env.MAX_LISTING_IMAGES || 20),
  fileFilter: (_req, file, cb) => {
    try { assertValidListingImage({ ...file, size: file.size || 0 }); cb(null, true); } catch (error) { cb(error); }
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


function parseImageOrder(body) {
  const raw = body.image_order ?? body.imageOrder;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function orderedListingImageUrls(uploadedImageUrls, submittedExistingUrls, directImageUrl, body) {
  const order = parseImageOrder(body);
  if (!order.length) return [...uploadedImageUrls, ...submittedExistingUrls, directImageUrl].filter(Boolean);
  const remainingUploads = [...uploadedImageUrls];
  const remainingUrls = new Set(submittedExistingUrls);
  if (directImageUrl) remainingUrls.add(directImageUrl);
  const ordered = [];
  order.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    if (item.type === 'file') {
      const idx = Number.parseInt(item.fileIndex, 10);
      const url = Number.isInteger(idx) ? uploadedImageUrls[idx] : remainingUploads.shift();
      if (url) ordered.push(url);
    } else if (item.type === 'url') {
      const url = sanitizeText(item.url);
      if (url && remainingUrls.has(url)) {
        ordered.push(url);
        remainingUrls.delete(url);
      }
    }
  });
  uploadedImageUrls.forEach((url) => { if (url && !ordered.includes(url)) ordered.push(url); });
  submittedExistingUrls.forEach((url) => { if (url && !ordered.includes(url)) ordered.push(url); });
  if (directImageUrl && !ordered.includes(directImageUrl)) ordered.push(directImageUrl);
  return ordered;
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
    ['property_subtype', 'propertySubtype'],
    ['owner_type', 'ownerType'],
    ['has_document', 'hasDocument'],
    ['project_name', 'projectName'],
    ['region_type', 'regionType'],
    ['district', 'district'],
    ['settlement', 'settlement'],
    ['metro_station', 'metroStation'],
    ['street_address', 'streetAddress'],
    ['latitude', 'latitude'],
    ['longitude', 'longitude'],
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

function listingLocationLabel(listing) {
  if (!listing) return '';
  if (listing.regionType === 'seabreeze') {
    return listing.projectName || listing.district || listing.settlement || 'Sea Breeze';
  }
  return listing.district || listing.city || listing.projectName || 'Digər ərazilər';
}

function listingLocationSummary(listing) {
  const primary = listing?.district || listing?.projectName || listing?.city || '';
  return {
    primary,
    district: listing?.district || '',
    settlement: listing?.settlement || '',
    metroStation: listing?.metroStation || '',
    streetAddress: listing?.streetAddress || '',
    latitude: listing?.latitude ?? null,
    longitude: listing?.longitude ?? null,
    hasCoordinates: Number.isFinite(Number(listing?.latitude)) && Number.isFinite(Number(listing?.longitude)),
    cardLines: [
      ...(primary ? [{ icon: '📍', label: primary }] : []),
      ...(listing?.metroStation ? [{ icon: '🚇', label: listing.metroStation }] : []),
    ],
  };
}

function listingBadges(listing) {
  const badges = [];
  if (listing?.listingType) {
    badges.push({ key: 'listing_type', label: String(listing.listingType).toUpperCase(), background: '#111827', color: '#FFFFFF', fontWeight: 700 });
  }
  if (listing?.isCredit) {
    badges.push({ key: 'credit', label: 'KREDİTLƏ', background: '#DC2626', color: '#FFFFFF', fontWeight: 600 });
  }
  if (listing?.hasDocument) {
    badges.push({ key: 'document', label: 'KUPÇA VAR', background: '#16A34A', color: '#FFFFFF', fontWeight: 600 });
  }
  if (listing?.ownerType === 'agent') {
    badges.push({ key: 'owner_type', label: 'VASİTƏÇİ', background: '#F59E0B', color: '#111827', fontWeight: 600 });
  } else {
    badges.push({ key: 'owner_type', label: 'SAHİBİNDƏN', background: '#2563EB', color: '#FFFFFF', fontWeight: 600 });
  }
  return badges.map((badge, index) => ({ ...badge, stackIndex: index }));
}

function decorateListingUi(listings) {
  const rows = Array.isArray(listings) ? listings : [listings].filter(Boolean);
  rows.forEach((listing) => {
    listing.locationLabel = listingLocationLabel(listing);
    listing.locationSummary = listingLocationSummary(listing);
    listing.badges = listingBadges(listing);
  });
  return listings;
}

function orderedListingRows(rows) {
  return [...rows].sort((a, b) => (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)) || (listingSortValue(b.id) - listingSortValue(a.id)));
}


const REGION_TYPES = new Set(['seabreeze', 'general', 'baki', 'absheron', 'sumqayit']);
const REGION_LABELS = { seabreeze: 'Sea Breeze', general: 'Digər ərazilər', baki: 'Bakı', absheron: 'Abşeron', sumqayit: 'Sumqayıt' };
const REGION_SELECTOR_OPTIONS = [
  { value: 'seabreeze', label: 'Sea Breeze', categories: ['Mənzil', 'Villa', 'Townhouse', 'Penthouse'] },
  { value: 'general', label: 'Digər ərazilər', cities: [
    { value: 'baki', label: 'Bakı' },
    { value: 'absheron', label: 'Abşeron' },
    { value: 'sumqayit', label: 'Sumqayıt' },
  ], categories: ['Yeni tikili', 'Köhnə tikili', 'Həyət evi', 'Villa', 'Obyekt', 'Ofis', 'Torpaq'] },
];
const LISTING_CARD_CONTRACT = {
  visibleFields: ['image', 'price', 'area', 'rooms', 'location', 'badges'],
  hiddenFields: ['descriptionPreview'],
  badgeLayout: { position: 'top-right', direction: 'vertical', gapPx: 6, noOverlap: true },
};

const BAKU_METRO_STATIONS = [
  '28 May', 'Nizami', 'Gənclik', 'Nərimanov', 'Nəsimi', 'Dərnəgül', 'Həzi Aslanov',
  'Ulduz', 'Avtovağzal', 'Xocasən', 'Xətai', 'İnşaatçılar', 'Elmlər Akademiyası',
  'Memar Əcəmi', 'Azadlıq Prospekti', 'Neftçilər', 'Qara Qarayev', 'Xalqlar Dostluğu',
  'Əhmədli', 'Koroğlu', 'İçərişəhər', 'Sahil', 'Cəfər Cabbarlı', '20 Yanvar',
  '8 Noyabr', 'Bakmil', 'Memar Əcəmi-2',
];
const BAKU_DISTRICTS = ['Yasamal', 'Binəqədi', 'Nərimanov', 'Nəsimi', 'Xətai', 'Sabunçu', 'Suraxanı', 'Qaradağ', 'Pirallahı', 'Səbail'];
const SETTLEMENTS = ['Bilgəh', 'Mərdəkan', 'Buzovna', 'Hövsan', 'Masazır', 'Mehdiabad', 'Novxanı', 'Ramana', 'Zabrat', 'Kürdəxanı', 'Türkan', 'Şüvəlan'];

function normalizeRegionType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['sea breeze', 'sea-breeze', 'seabreeze'].includes(normalized)) return 'seabreeze';
  if (['general', 'elanlar', 'digər ərazilər', 'diger eraziler', 'umumi', 'ümumi'].includes(normalized)) return 'general';
  if (['baki', 'bakı'].includes(normalized)) return 'baki';
  if (['absheron', 'abşeron', 'abseron'].includes(normalized)) return 'absheron';
  if (['sumqayit', 'sumqayıt'].includes(normalized)) return 'sumqayit';
  return REGION_TYPES.has(normalized) ? normalized : undefined;
}

function normalizeListingRegionData(data, body = {}, existing = {}) {
  const rawRegion = body.region_type ?? body.regionType ?? data.regionType ?? existing.regionType;
  const requestedRegion = normalizeRegionType(rawRegion);
  const city = sanitizeText(body.city ?? data.city ?? existing.city ?? '');
  const legacyGeneralRegion = ['baki', 'absheron', 'sumqayit'].includes(requestedRegion) ? requestedRegion : null;
  const regionType = requestedRegion === 'seabreeze'
    ? 'seabreeze'
    : (requestedRegion === 'general' || legacyGeneralRegion ? 'general' : (!rawRegion && (data.projectName || existing.projectName) ? 'seabreeze' : undefined));
  if (regionType) data.regionType = regionType;
  if (regionType === 'seabreeze') {
    data.city = 'Sea Breeze';
    data.neighborhood = sanitizeText(body.neighborhood ?? data.neighborhood ?? existing.neighborhood ?? '') || undefined;
    data.district = sanitizeText(body.district ?? data.district ?? data.projectName ?? existing.district ?? existing.projectName ?? '') || undefined;
    return data;
  }
  if (regionType === 'general') {
    const nextCity = legacyGeneralRegion ? REGION_LABELS[legacyGeneralRegion] : city;
    if (nextCity) data.city = nextCity;
    if ((nextCity || '').toLowerCase() === 'sumqayıt' || legacyGeneralRegion === 'sumqayit') {
      data.city = REGION_LABELS.sumqayit;
      data.district = null;
    } else {
      const rawDistrict = body.district ?? data.district ?? existing.district;
      data.district = rawDistrict ? sanitizeText(rawDistrict) : undefined;
    }
    data.neighborhood = sanitizeText(body.neighborhood ?? data.neighborhood ?? existing.neighborhood ?? '') || undefined;
  }
  return data;
}

function listingRegionFilterWhere(query) {
  const regionType = normalizeRegionType(query.region_type ?? query.regionType ?? query.region);
  const city = sanitizeText(query.city ?? '');
  const district = sanitizeText(query.district ?? '');
  const neighborhood = sanitizeText(query.neighborhood ?? '');
  const clauses = [];
  if (regionType === 'seabreeze') {
    clauses.push({ OR: [{ regionType: 'seabreeze' }, { AND: [{ regionType: null }, { projectName: { not: null } }] }] });
  } else if (regionType === 'general') {
    clauses.push({ regionType: 'general' });
  } else if (['baki', 'absheron', 'sumqayit'].includes(regionType)) {
    clauses.push({ regionType: 'general', city: REGION_LABELS[regionType] });
  } else if (regionType) {
    clauses.push({ regionType });
  }
  if (city) clauses.push({ city });
  if (district) {
    clauses.push(regionType === 'seabreeze'
      ? { OR: [{ district }, { AND: [{ district: null }, { projectName: district }] }] }
      : { district });
  }
  if (neighborhood) clauses.push({ neighborhood });
  return clauses.length ? { AND: clauses } : undefined;
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

async function listListings(req, res, extraWhere) {
  const q = String(req.query.q || '').trim();
  const normalizedCodeQuery = String(req.query.listingCode || req.query.code || (/^BH?\d+$/i.test(q) || /^\d+$/.test(q) ? q : '')).replace(/^BH/i, '');
  const code = /^\d+$/.test(normalizedCodeQuery) ? BigInt(normalizedCodeQuery) : null;
  const searchWhere = q || code !== null ? { OR: [
    ...(q ? [
      { title: { contains: q, mode: 'insensitive' } },
      { projectName: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { district: { contains: q, mode: 'insensitive' } },
      { settlement: { contains: q, mode: 'insensitive' } },
      { metroStation: { contains: q, mode: 'insensitive' } },
      { streetAddress: { contains: q, mode: 'insensitive' } },
    ] : []),
    ...(code !== null ? [{ listingCode: code }] : []),
  ] } : undefined;
  const regionWhere = listingRegionFilterWhere(req.query);
  const creditValue = req.query.credit ?? req.query.is_credit ?? req.query.isCredit;
  const creditWhere = ['true', '1', 'yes', 'on'].includes(String(creditValue || '').toLowerCase()) ? { isCredit: true } : undefined;
  const queryWhere = searchWhere && regionWhere ? { AND: [searchWhere, regionWhere] } : (searchWhere || regionWhere);
  const combinedQueryWhere = queryWhere && creditWhere ? { AND: [queryWhere, creditWhere] } : (queryWhere || creditWhere);
  const baseWhere = combinedQueryWhere && extraWhere ? { AND: [combinedQueryWhere, extraWhere] } : (combinedQueryWhere || extraWhere);
  const where = listingVisibilityWhere(req, baseWhere);
  const { page, limit, skip, take } = pagination(req.query);
  const [data, total] = await Promise.all([
    prisma.listing.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include, skip, take }),
    prisma.listing.count({ where }),
  ]);
  await attachListingUsers(data);
  decorateListingUi(data);
  res.json({ data: orderedListingRows(data), total, page, totalPages: Math.max(Math.ceil(total / limit), 1) });
}



router.get('/admin', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const normalizedCodeQuery = String(req.query.listingCode || req.query.code || (/^BH?\d+$/i.test(q) || /^\d+$/.test(q) ? q : '')).replace(/^BH/i, '');
  const code = /^\d+$/.test(normalizedCodeQuery) ? BigInt(normalizedCodeQuery) : null;
  const searchWhere = q || code !== null ? { OR: [
    ...(q ? [
      { title: { contains: q, mode: 'insensitive' } },
      { projectName: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { district: { contains: q, mode: 'insensitive' } },
      { settlement: { contains: q, mode: 'insensitive' } },
      { metroStation: { contains: q, mode: 'insensitive' } },
      { streetAddress: { contains: q, mode: 'insensitive' } },
    ] : []),
    ...(code !== null ? [{ listingCode: code }] : []),
  ] } : undefined;
  const regionWhere = listingRegionFilterWhere(req.query);
  const status = normalizeListingStatus(req.query.status, null);
  const whereClauses = [searchWhere, regionWhere, status ? { status } : null].filter(Boolean);
  const where = whereClauses.length ? { AND: whereClauses } : undefined;
  const data = await prisma.listing.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include });
  await attachListingUsers(data);
  decorateListingUi(data);
  res.json({ data: orderedListingRows(data), total: data.length, page: 1, totalPages: 1 });
}));

router.get('/options', (_req, res) => {
  res.json({
    regions: REGION_SELECTOR_OPTIONS,
    ownerTypes: [
      { value: 'owner', label: 'Əmlak sahibi', badge: 'SAHİBİNDƏN' },
      { value: 'agent', label: 'Vasitəçi', badge: 'VASİTƏÇİ' },
    ],
    documentField: { name: 'has_document', label: 'Kupça / Çıxarış var' },
    card: LISTING_CARD_CONTRACT,
    location: {
      mapProvider: 'OpenStreetMap + Leaflet',
      searchProvider: 'Mapbox Geocoding API → local Azerbaijan/Baku index → Nominatim',
      fields: ['district', 'settlement', 'metro_station', 'street_address', 'latitude', 'longitude'],
      metroStations: BAKU_METRO_STATIONS,
      districts: BAKU_DISTRICTS,
      settlements: SETTLEMENTS,
      mapHeights: { desktop: 280, mobile: 220 },
    },
  });
});

router.get('/', optionalAuthenticate, asyncHandler(async (req, res) => listListings(req, res)));
router.get('/sea-breeze', optionalAuthenticate, asyncHandler(async (req, res) => listListings(req, res, { regionType: 'seabreeze' })));
router.get('/general', optionalAuthenticate, asyncHandler(async (req, res) => listListings(req, res, { regionType: 'general' })));


router.get('/mine', authenticate, authorize('user', 'admin'), asyncHandler(async (req, res) => {
  const where = req.auth.role === 'admin' ? {} : { userId: toBigIntId(req.auth.id) };
  const data = await prisma.listing.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include });
  await attachListingUsers(data);
  decorateListingUi(data);
  res.json(data);
}));

router.put('/reorder', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const items = parseListingOrder(req.body);
  if (!items.length) return res.status(400).json({ message: 'Listing order array is required.' });

  const uniqueIds = new Set(items.map((item) => item.id));
  if (uniqueIds.size !== items.length) return res.status(400).json({ message: 'Listing IDs must be unique.' });

  await prisma.$transaction(items.map((item) => (
    prisma.listing.update({ where: { id: item.id }, data: { displayOrder: item.displayOrder } })
  )));

  const data = await prisma.listing.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include });
  await attachListingUsers(data);
  decorateListingUi(data);
  res.json({ ok: true, data: orderedListingRows(data) });
}));


router.patch('/:id/approve', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid listing ID.' });
  const existing = await prisma.listing.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return res.status(404).json({ message: 'Record not found.' });
  const shouldSendApprovalEmail = existing.status !== 'approved';
  const updated = await prisma.listing.update({
    where: { id },
    data: { status: 'approved', approvedAt: existing.status === 'approved' ? undefined : new Date(), approvedBy: toBigIntId(req.auth.id) },
    include,
  });
  await attachListingUsers(updated);
  if (updated.userId) {
    await createNotification({
      userId: Number(updated.userId),
      title: 'Elanınız təsdiqləndi',
      message: updated.title,
      type: 'listing_approved',
      link: `/listing/${updated.listingCode || updated.id}`,
    });
  }
  if (shouldSendApprovalEmail && updated.status === 'approved') {
    try {
      await sendListingApprovedEmail(updated, updated.user);
    } catch (error) {
      console.error('[listing-approved-email] failed', { listingId: updated.id, error: notificationErrorDetails(error) });
    }
  }
  decorateListingUi(updated);
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
  if (updated.userId) {
    await createNotification({
      userId: Number(updated.userId),
      title: 'Elanınız rədd edildi',
      message: updated.title,
      type: 'listing_rejected',
      link: `/profil/elanlarim`,
    });
  }
  decorateListingUi(updated);
  res.json(updated);
}));

router.patch('/:id/deactivate', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid listing ID.' });
  const updated = await prisma.listing.update({
    where: { id },
    data: { status: 'pending', approvedAt: null, approvedBy: null },
    include,
  });
  await attachListingUsers(updated);
  decorateListingUi(updated);
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

router.get('/code/:listingCode', optionalAuthenticate, asyncHandler(async (req, res) => {
  const normalizedListingCode = String(req.params.listingCode || '').replace(/^BH/i, '');
  if (!/^\d+$/.test(normalizedListingCode) || BigInt(normalizedListingCode) < 1n) return res.status(400).json({ message: 'Invalid listing code.' });
  const listingCode = BigInt(normalizedListingCode);
  const data = await prisma.listing.findUnique({ where: { listingCode }, include });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  const canSee = data.status === 'approved' || req.auth?.role === 'admin' || (req.auth?.role === 'user' && sameId(data.userId, req.auth.id));
  if (!canSee) return res.status(404).json({ message: 'Record not found.' });
  await attachListingUsers(data);
  decorateListingUi(data);
  return res.json(data);
}));


router.get('/:id/navigation', optionalAuthenticate, asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid listing ID.' });
  const regionWhere = listingRegionFilterWhere(req.query);
  const q = String(req.query.q || '').trim();
  const searchWhere = q ? { OR: [
    { title: { contains: q, mode: 'insensitive' } },
    { projectName: { contains: q, mode: 'insensitive' } },
    { description: { contains: q, mode: 'insensitive' } },
  ] } : undefined;
  const creditValue = req.query.credit ?? req.query.is_credit ?? req.query.isCredit;
  const creditWhere = ['true', '1', 'yes', 'on'].includes(String(creditValue || '').toLowerCase()) ? { isCredit: true } : undefined;
  const pieces = [regionWhere, searchWhere, creditWhere].filter(Boolean);
  const where = listingVisibilityWhere(req, pieces.length ? { AND: pieces } : undefined);
  const rows = await prisma.listing.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include, take: 1000 });
  await attachListingUsers(rows);
  decorateListingUi(rows);
  const ordered = orderedListingRows(rows);
  const index = ordered.findIndex((listing) => String(listing.id) === String(id));
  if (index === -1) return res.status(404).json({ message: 'Record not found in current listing set.' });
  res.json({
    currentIndex: index,
    total: ordered.length,
    previous: index > 0 ? ordered[index - 1] : null,
    next: index < ordered.length - 1 ? ordered[index + 1] : null,
    navigation: { desktop: 'side', mobile: 'bottom', keyboard: { previous: 'ArrowLeft', next: 'ArrowRight' }, reload: false, transition: 'smooth' },
  });
}));

router.get('/:id', optionalAuthenticate, asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid listing ID.' });
  const data = await prisma.listing.findUnique({ where: { id }, include });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  const canSee = data.status === 'approved' || req.auth?.role === 'admin' || (req.auth?.role === 'user' && sameId(data.userId, req.auth.id));
  if (!canSee) return res.status(404).json({ message: 'Record not found.' });
  await attachListingUsers(data);
  decorateListingUi(data);
  return res.json(data);
}));

router.post('/', authenticate, authorize('admin', 'user'), listingUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: Number(process.env.MAX_LISTING_IMAGES || 20) },
]), asyncHandler(async (req, res) => {
  try {
    const ownerPhone = await ensureListingOwnerPhone(req, res);
    if (!ownerPhone) return;
    const files = listingFiles(req);
    const fileOriginalNames = files.map((file) => file.originalname);
    const fileSummary = summarizeUploadedFiles(files);
    console.log('BODY', req.body);
    console.log('FILES', req.files);
    console.log('[listings] files summary', fileSummary);
    console.log('[listings] field name comparison', compareListingFieldNames(req.body));
    fileOriginalNames.forEach((originalname) => console.log('file.originalname', originalname));
    const uploadedImageUrls = await uploadListingFiles(files);
    const submittedExistingUrls = parseExistingImageUrls(req.body);
    const directImageUrl = req.body.image_url ?? req.body.imageUrl;
    const rawImageUrls = orderedListingImageUrls(uploadedImageUrls, submittedExistingUrls, directImageUrl, req.body);
    logListingInputSanitization(req.body, rawImageUrls);
    const imageUrls = sanitizeImageUrls(rawImageUrls);
    const data = normalizeListingRegionData(sanitizeListingPayload(compact(serializers.listing({ ...req.body, image_url: imageUrls[0] || req.body.image_url || req.body.imageUrl }, req))), req.body);
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
      for (let attempt = 1; attempt <= LISTING_CODE_MAX_RETRIES; attempt += 1) {
        const retryCount = attempt - 1;
        const txPayload = { ...payload };
        delete txPayload.listingCode;
        txPayload.listingCode = await generateListingCode(prisma, retryCount);
        try {
          listing = await prisma.listing.create({ data: txPayload, include });
          break;
        } catch (error) {
          const isListingCodeDuplicate = isListingCodeCollision(error);
          console.warn('[listings] listing_code create attempt failed', {
            attempt,
            retryCount,
            listingCode: txPayload.listingCode?.toString(),
            isListingCodeDuplicate,
            code: error.code,
            meta: error.meta,
          });
          if (!isListingCodeDuplicate) throw error;
        }
      }
      if (!listing) throw new Error('Unable to create listing with a unique listing_code');
      createArgs.data = { ...payload, listingCode: listing.listingCode };
      console.log('LISTING INSERT OK', listing);
    } catch (error) {
      console.error('[listings] prisma.listing.create error details', {
        code: error.code,
        meta: error.meta,
        stack: error.stack,
      });
      return res.status(500).json(LISTING_CODE_ERROR_RESPONSE);
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
        return res.status(500).json({ success: false, message: 'Elan şəkilləri yadda saxlanılarkən xəta baş verdi.' });
      }
    } else {
      console.log('LISTING_IMAGES INSERT OK', { count: 0 });
    }

    const savedListing = await prisma.listing.findUnique({ where: { id: listing.id }, include });
    await logUserActivity(prisma, req.auth.id, 'create_listing');
    const responseListing = savedListing || listing;
    await attachListingUsers(responseListing);
    if (req.auth.role === 'user' && responseListing.status === 'pending') {
      Promise.resolve(sendListingPendingEmail(responseListing, responseListing.user || req.auth))
        .catch((error) => console.error('[listing-pending-email] failed', { listingId: responseListing.id, error: notificationErrorDetails(error) }));
      Promise.resolve(sendNewListingNotification(responseListing, responseListing.user || req.auth)).catch(() => {});
      Promise.resolve(notifyAdmins({
        title: 'Yeni elan təsdiq gözləyir',
        message: responseListing.title,
        type: 'listing_pending',
        link: `/admin/listings?review=${responseListing.id}`,
      })).catch(() => {});
    }
    decorateListingUi(responseListing);
    return res.status(201).json({ success: true, listing: responseListing });
  } catch (error) {
    logListingApiError(error);
    if (isListingCodeCollision(error)) {
      return res.status(500).json(LISTING_CODE_ERROR_RESPONSE);
    }
    return res.status(500).json({ success: false, message: 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.' });
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
  const directImageUrl = req.body.image_url ?? req.body.imageUrl;
  const keepCurrentImages = !uploadedImageUrls.length && !submittedExistingUrls.length && !directImageUrl;
  const imageUrls = keepCurrentImages
    ? sanitizeImageUrls(existing.images.sort((a, b) => a.sortOrder - b.sortOrder).map((img) => img.imageUrl))
    : sanitizeImageUrls(orderedListingImageUrls(uploadedImageUrls, submittedExistingUrls, directImageUrl, req.body));

  const data = normalizeListingRegionData(sanitizeListingPayload(compact(serializers.listing({ ...req.body, image_url: imageUrls[0] || req.body.image_url || req.body.imageUrl }, req))), req.body, existing);
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
  await logUserActivity(prisma, req.auth.id, 'edit_listing');
  await attachListingUsers(updated);
  if (existing.status !== 'approved' && updated.status === 'approved') {
    try {
      await sendListingApprovedEmail(updated, updated.user);
    } catch (error) {
      console.error('[listing-approved-email] failed', { listingId: updated.id, error: notificationErrorDetails(error) });
    }
  }
  decorateListingUi(updated);
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin', 'user'), asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid listing ID.' });
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Record not found.' });
  if (req.auth.role === 'user' && !sameId(existing.userId, req.auth.id)) return res.status(403).json({ message: 'You do not have permission for this action.' });
  await prisma.listing.delete({ where: { id } });
  await logUserActivity(prisma, req.auth.id, 'delete_listing');
  res.status(204).send();
}));

module.exports = router;
