const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const DEFAULT_SLIDE_DURATION = 10;
const MIN_SLIDE_DURATION = 1;
const MAX_SLIDE_DURATION = 3600;
const MAX_ACTIVE_LISTING_HERO_ITEMS = 10;

function parseBool(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDuration(value, fallback = DEFAULT_SLIDE_DURATION) {
  return Math.min(Math.max(parseInteger(value, fallback), MIN_SLIDE_DURATION), MAX_SLIDE_DURATION);
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

function inferMediaType(url = '') {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(String(url || '')) ? 'video' : 'image';
}

function firstListingImage(listing) {
  if (!listing) return '';
  if (listing.imageUrl) return String(listing.imageUrl || '').trim();
  if (Array.isArray(listing.images) && listing.images.length) return String(listing.images[0]?.imageUrl || listing.images[0] || '').trim();
  return '';
}

function normalizePayload(body = {}, existing = {}) {
  return {
    badgeText: String(body.badge_text ?? body.badgeText ?? existing.badgeText ?? '').trim(),
    slideDuration: parseDuration(body.slide_duration ?? body.slideDuration, existing.slideDuration ?? DEFAULT_SLIDE_DURATION),
    customTitle: String(body.custom_title ?? body.customTitle ?? existing.customTitle ?? '').trim(),
    customDescription: '',
    heroMediaUrl: String(body.hero_media_url ?? body.heroMediaUrl ?? existing.heroMediaUrl ?? '').trim(),
    sortOrder: parseInteger(body.sort_order ?? body.sortOrder, existing.sortOrder ?? 0),
    isActive: parseBool(body.is_active ?? body.isActive, existing.isActive ?? true),
  };
}

function listingLocation(listing) {
  if (!listing) return '';
  return [listing.district, listing.settlement, listing.city, listing.projectName].filter(Boolean)[0] || '';
}

function serializeListingHeroItem(item) {
  if (!item) return item;
  const listing = item.listing || null;
  const mediaUrl = String(item.heroMediaUrl || firstListingImage(listing) || '').trim();
  const title = String(item.customTitle || listing?.title || '').trim();
  const description = '';
  return {
    ...item,
    title,
    description,
    mediaType: inferMediaType(mediaUrl),
    mediaUrl,
    region: listingLocation(listing),
    listing_id: item.listingId,
    sort_order: item.sortOrder,
    is_active: item.isActive,
    badge_text: item.badgeText,
    slide_duration: item.slideDuration ?? DEFAULT_SLIDE_DURATION,
    custom_title: item.customTitle,
    custom_description: '',
    hero_media_url: item.heroMediaUrl,
    media_type: inferMediaType(mediaUrl),
    media_url: mediaUrl,
    listing: listing || undefined,
  };
}

function orderBy() {
  return [{ sortOrder: 'asc' }, { id: 'asc' }];
}

const include = { listing: { include: { images: { orderBy: { sortOrder: 'asc' } } } } };

router.get('/', asyncHandler(async (req, res) => {
  const adminView = req.query.admin === '1' || req.query.admin === 'true';
  const items = await prisma.listingHeroItem.findMany({
    where: adminView ? undefined : { isActive: true, listing: { status: 'approved' } },
    include,
    orderBy: orderBy(),
    take: adminView ? undefined : MAX_ACTIVE_LISTING_HERO_ITEMS,
  });
  res.json(items.map(serializeListingHeroItem));
}));

router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const listingId = toBigIntId(req.body?.listing_id ?? req.body?.listingId);
  if (!listingId) return res.status(400).json({ message: 'Listing ID is required.' });
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return res.status(404).json({ message: 'Listing not found.' });
  const maxOrder = await prisma.listingHeroItem.aggregate({ _max: { sortOrder: true } });
  const data = normalizePayload({ sort_order: (maxOrder._max.sortOrder || 0) + 1, ...req.body });
  const existing = await prisma.listingHeroItem.findFirst({ where: { listingId } });
  const saved = existing
    ? await prisma.listingHeroItem.update({ where: { id: existing.id }, data, include })
    : await prisma.listingHeroItem.create({ data: { ...data, listingId }, include });
  res.status(existing ? 200 : 201).json(serializeListingHeroItem(saved));
}));

router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.listingHeroItem.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: 'Listing hero item not found.' });
  const updated = await prisma.listingHeroItem.update({ where: { id: existing.id }, data: normalizePayload(req.body, existing), include });
  res.json(serializeListingHeroItem(updated));
}));

router.patch('/:id/toggle', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.listingHeroItem.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: 'Listing hero item not found.' });
  const updated = await prisma.listingHeroItem.update({
    where: { id: existing.id },
    data: { isActive: parseBool(req.body?.is_active ?? req.body?.isActive, !existing.isActive) },
    include,
  });
  res.json(serializeListingHeroItem(updated));
}));

router.patch('/reorder', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ message: 'Reorder items are required.' });
  await prisma.$transaction(items.map((item, index) => prisma.listingHeroItem.update({
    where: { id: Number(item.id) },
    data: { sortOrder: parseInteger(item.sort_order ?? item.sortOrder, index + 1) },
  })));
  const rows = await prisma.listingHeroItem.findMany({ include, orderBy: orderBy() });
  res.json(rows.map(serializeListingHeroItem));
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.listingHeroItem.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

router.delete('/listing/:listingId', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const listingId = toBigIntId(req.params.listingId);
  if (!listingId) return res.status(400).json({ message: 'Invalid listing ID.' });
  await prisma.listingHeroItem.deleteMany({ where: { listingId } });
  res.status(204).send();
}));

module.exports = router;
