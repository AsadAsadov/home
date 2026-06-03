const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { logUserActivity } = require('../utils/activity');

const router = express.Router();

function toBigIntId(value) {
  if (value === undefined || value === null || value === '') return undefined;
  try {
    const id = BigInt(value);
    return id > 0n ? id : undefined;
  } catch (_error) {
    return undefined;
  }
}

const includeListing = { listing: { include: { images: { orderBy: { sortOrder: 'asc' } } } } };

function logFavoritesSummary(userId, favoritesCount, validListingsCount) {
  console.info('Favorites query summary', {
    userId: userId?.toString(),
    favoritesCount,
    validListingsCount,
    orphanFavoritesCount: Math.max(favoritesCount - validListingsCount, 0),
  });
}

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const userId = toBigIntId(req.auth.id);
  const validFavoriteWhere = { userId, listing: { isNot: null } };
  const [favoritesCount, favorites] = await Promise.all([
    prisma.favorite.count({ where: { userId } }),
    prisma.favorite.findMany({
      where: validFavoriteWhere,
      orderBy: { createdAt: 'desc' },
      include: includeListing,
    }),
  ]);

  logFavoritesSummary(userId, favoritesCount, favorites.length);
  res.json(favorites);
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const userId = toBigIntId(req.auth.id);
  const listingId = toBigIntId(req.body.listing_id ?? req.body.listingId);
  if (!listingId) return res.status(400).json({ message: 'listingId is required.' });
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== 'approved') return res.status(404).json({ message: 'Listing not found.' });
  const favorite = await prisma.$transaction(async (tx) => {
    const created = await tx.favorite.upsert({
      where: { userId_listingId: { userId, listingId } },
      update: {},
      create: { userId, listingId },
      include: includeListing,
    });
    const count = await tx.favorite.count({ where: { listingId } });
    await tx.listing.update({ where: { id: listingId }, data: { favoritesCount: count } });
    return created;
  });
  await logUserActivity(prisma, req.auth.id, 'add_favorite');
  res.status(201).json(favorite);
}));

router.delete('/:listingId', authenticate, asyncHandler(async (req, res) => {
  const userId = toBigIntId(req.auth.id);
  const listingId = toBigIntId(req.params.listingId);
  if (!listingId) return res.status(400).json({ message: 'Invalid listing ID.' });
  await prisma.$transaction(async (tx) => {
    await tx.favorite.deleteMany({ where: { userId, listingId } });
    const count = await tx.favorite.count({ where: { listingId } });
    await tx.listing.update({ where: { id: listingId }, data: { favoritesCount: count } }).catch(() => null);
  });
  res.status(204).send();
}));

module.exports = router;
