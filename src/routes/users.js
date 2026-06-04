const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadAvatarImage, assertValidListingImage } = require('../utils/supabaseStorage');
const router = express.Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_AVATAR_IMAGE_SIZE_BYTES || 5 * 1024 * 1024), files: 1 },
  fileFilter: (_req, file, cb) => {
    try { assertValidListingImage({ ...file, size: file.size || 0 }); cb(null, true); } catch (error) { cb(error); }
  },
});

function publicUser(user) {
  const { passwordHash, googleId, ...safe } = user;
  return safe;
}

function toBigIntId(value) {
  if (value === undefined || value === null || value === '') return undefined;
  try { return BigInt(value); } catch (_error) { return undefined; }
}

async function attachUserStats(users) {
  const rows = Array.isArray(users) ? users : [users].filter(Boolean);
  const ids = rows.map((user) => toBigIntId(user.id)).filter((id) => id !== undefined);
  if (!ids.length) return rows;
  const [listings, favorites] = await Promise.all([
    prisma.listing.groupBy({
      by: ['userId', 'status'],
      where: { userId: { in: ids } },
      _count: { _all: true },
      _sum: { viewCount: true, favoritesCount: true },
    }),
    prisma.favorite.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _count: { _all: true } }),
  ]);
  const byUser = new Map();
  listings.forEach((row) => {
    const key = String(row.userId);
    const current = byUser.get(key) || { listingsCount: 0, activeListingsCount: 0, approvedListingsCount: 0, pendingListingsCount: 0, rejectedListingsCount: 0, totalListingViews: 0, totalFavorites: 0, favoritesCount: 0 };
    const count = row._count?._all || 0;
    current.listingsCount += count;
    current.totalListingViews += row._sum?.viewCount || 0;
    current.totalFavorites += row._sum?.favoritesCount || 0;
    if (row.status === 'approved') { current.approvedListingsCount += count; current.activeListingsCount += count; }
    if (row.status === 'pending') current.pendingListingsCount += count;
    if (row.status === 'rejected') current.rejectedListingsCount += count;
    byUser.set(key, current);
  });
  favorites.forEach((row) => {
    const key = String(row.userId);
    const current = byUser.get(key) || { listingsCount: 0, activeListingsCount: 0, approvedListingsCount: 0, pendingListingsCount: 0, rejectedListingsCount: 0, totalListingViews: 0, totalFavorites: 0, favoritesCount: 0 };
    current.favoritesCount = row._count?._all || 0;
    byUser.set(key, current);
  });
  rows.forEach((user) => Object.assign(user, byUser.get(String(user.id)) || { listingsCount: 0, activeListingsCount: 0, approvedListingsCount: 0, pendingListingsCount: 0, rejectedListingsCount: 0, totalListingViews: 0, totalFavorites: 0, favoritesCount: 0 }));
  return rows;
}

function clean(value) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}

function data(body) {
  const role = clean(body.role);
  const out = {
    fullname: clean(body.fullname),
    email: clean(body.email)?.toLowerCase(),
    role: ['admin', 'user'].includes(role) ? role : undefined,
    avatarUrl: clean(body.avatar_url ?? body.avatarUrl),
    bio: clean(body.bio),
  };
  if (Object.prototype.hasOwnProperty.call(body, 'phone')) out.phone = clean(body.phone) ?? null;
  if (Object.prototype.hasOwnProperty.call(body, 'is_active') || Object.prototype.hasOwnProperty.call(body, 'isActive')) out.isActive = Boolean(body.is_active ?? body.isActive);
  if (Object.prototype.hasOwnProperty.call(body, 'email_verified') || Object.prototype.hasOwnProperty.call(body, 'emailVerified')) out.emailVerified = Boolean(body.email_verified ?? body.emailVerified);
  if (Object.prototype.hasOwnProperty.call(body, 'phone_verified') || Object.prototype.hasOwnProperty.call(body, 'phoneVerified')) out.phoneVerified = Boolean(body.phone_verified ?? body.phoneVerified);
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}


function profileCompletion(user) {
  let score = 0;
  if (user.avatarUrl) score += 25;
  if (user.phone) score += 25;
  if (user.bio) score += 25;
  if (user.fullname && user.email) score += 25;
  return score;
}

async function publicProfilePayload(userId, { page = 1, limit = 12, includeAllListings = false } = {}) {
  const numericId = Number(userId);
  if (!Number.isInteger(numericId) || numericId < 1) return null;
  const user = await prisma.user.findUnique({
    where: { id: numericId },
    select: { id: true, fullname: true, email: true, phone: true, avatarUrl: true, bio: true, role: true, isActive: true, createdAt: true, updatedAt: true, lastLogin: true },
  });
  if (!user || user.isActive === false) return null;
  const safe = { ...user, email: undefined, phone: undefined, lastLogin: undefined };
  await attachUserStats(safe);
  safe.profileCompletion = profileCompletion(user);
  const userIdBig = toBigIntId(numericId);
  const take = Math.min(Math.max(Number.parseInt(limit, 10) || 12, 1), 48);
  const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const where = { userId: userIdBig, status: 'approved' };
  const [listings, total] = await Promise.all([
    prisma.listing.findMany({ where, orderBy: { createdAt: 'desc' }, include: { images: { orderBy: { sortOrder: 'asc' } } }, skip: (currentPage - 1) * take, take }),
    prisma.listing.count({ where }),
  ]);
  listings.forEach((listing) => { listing.user = safe; });
  return {
    user: safe,
    listings: includeAllListings ? listings : listings,
    pagination: { page: currentPage, limit: take, total, totalPages: Math.max(Math.ceil(total / take), 1) },
    seo: { title: `${safe.fullname} - BestHome`, description: `Approved listings published by ${safe.fullname}` },
  };
}

router.get('/public/:id', asyncHandler(async (req, res) => {
  const payload = await publicProfilePayload(req.params.id, { page: 1, limit: req.query.limit || 12 });
  if (!payload) return res.status(404).json({ message: 'User not found.' });
  res.json(payload);
}));

router.get('/public/:id/listings', asyncHandler(async (req, res) => {
  const payload = await publicProfilePayload(req.params.id, { page: req.query.page, limit: req.query.limit || 12, includeAllListings: true });
  if (!payload) return res.status(404).json({ message: 'User not found.' });
  res.json(payload);
}));

router.post('/me/avatar', authenticate, avatarUpload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Avatar file is required.' });
  const avatarUrl = await uploadAvatarImage(req.file, req.auth.id);
  const user = await prisma.user.update({ where: { id: Number(req.auth.id) }, data: { avatarUrl } });
  res.json({ avatarUrl, user: publicUser(user) });
}));

router.delete('/me/avatar', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: Number(req.auth.id) }, data: { avatarUrl: null } });
  res.json({ user: publicUser(user) });
}));

router.get('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const q = String(req.query.q || req.query.search || '').trim();
  const users = await prisma.user.findMany({
    where: q ? { OR: [
      { fullname: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ] } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  const safeUsers = users.map(publicUser);
  await attachUserStats(safeUsers);
  safeUsers.forEach((user) => {
    user.profileCompletion = profileCompletion(user);
    user.crmCard = {
      name: user.fullname,
      phone: user.phone,
      email: user.email,
      registrationDate: user.createdAt,
      lastLogin: user.lastLogin,
      role: user.role,
      activeStatus: user.isActive ? 'active' : 'inactive',
    };
  });
  res.json(safeUsers);
}));

router.get('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  const [recentListings, recentActivity] = await Promise.all([
    prisma.listing.findMany({ where: { userId: toBigIntId(user.id) }, orderBy: { createdAt: 'desc' }, take: 6, include: { images: { orderBy: { sortOrder: 'asc' } } } }),
    prisma.userActivityLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 10 }).catch(() => []),
  ]);
  const safe = publicUser(user);
  await attachUserStats(safe);
  safe.profileCompletion = profileCompletion(user);
  safe.recentListings = recentListings;
  safe.recentActivity = recentActivity;
  res.json(safe);
}));

router.get('/:id/listings', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const userId = toBigIntId(req.params.id);
  if (!userId) return res.status(400).json({ message: 'Invalid user ID.' });
  const listings = await prisma.listing.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });
  res.json(listings);
}));

router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const nextData = data(req.body);
  if (!nextData.fullname || !nextData.email) return res.status(400).json({ message: 'fullname and email are required.' });
  const passwordHash = await bcrypt.hash(req.body.password || 'BestHome123!', 12);
  const user = await prisma.user.create({ data: { ...nextData, passwordHash } });
  res.status(201).json(publicUser(user));
}));

router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const nextData = data(req.body);
  if (req.body.password && String(req.body.password).trim()) nextData.passwordHash = await bcrypt.hash(String(req.body.password).trim(), 12);
  const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: nextData });
  res.json(publicUser(user));
}));

router.patch('/:id/block', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { isActive: false } });
  await prisma.userSession.deleteMany({ where: { userId: user.id } }).catch(() => null);
  res.json(publicUser(user));
}));

router.patch('/:id/activate', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { isActive: true } });
  res.json(publicUser(user));
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
