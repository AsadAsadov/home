const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

function publicUser(user) {
  const { passwordHash, ...safe } = user;
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
  const listings = await prisma.listing.groupBy({
    by: ['userId', 'status'],
    where: { userId: { in: ids } },
    _count: { _all: true },
    _sum: { viewCount: true },
  });
  const byUser = new Map();
  listings.forEach((row) => {
    const key = String(row.userId);
    const current = byUser.get(key) || { listingsCount: 0, approvedListingsCount: 0, pendingListingsCount: 0, totalListingViews: 0 };
    const count = row._count?._all || 0;
    current.listingsCount += count;
    current.totalListingViews += row._sum?.viewCount || 0;
    if (row.status === 'approved') current.approvedListingsCount += count;
    if (row.status === 'pending') current.pendingListingsCount += count;
    byUser.set(key, current);
  });
  rows.forEach((user) => Object.assign(user, byUser.get(String(user.id)) || { listingsCount: 0, approvedListingsCount: 0, pendingListingsCount: 0, totalListingViews: 0 }));
  return rows;
}

function clean(value) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}

function data(body) {
  const role = clean(body.role);
  const out = { fullname: clean(body.fullname), email: clean(body.email), role: ['admin', 'user'].includes(role) ? role : undefined };
  if (Object.prototype.hasOwnProperty.call(body, 'phone')) out.phone = clean(body.phone) ?? null;
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

router.get('/', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  const safeUsers = users.map(publicUser);
  await attachUserStats(safeUsers);
  res.json(safeUsers);
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

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
