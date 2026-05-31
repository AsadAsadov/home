const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function activeAdWhere(now = new Date()) {
  return {
    isActive: true,
    OR: [{ startDate: null }, { startDate: { lte: now } }],
    AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
  };
}



function toBigIntId(value) {
  if (value === undefined || value === null || value === '') return undefined;
  try { return BigInt(value); } catch (_error) { return undefined; }
}

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const userId = toBigIntId(req.auth.id);
  const [totalListings, activeListings, pendingListings, rejectedListings, listingsAgg, favoriteCount] = await Promise.all([
    prisma.listing.count({ where: { userId } }),
    prisma.listing.count({ where: { userId, status: 'approved' } }),
    prisma.listing.count({ where: { userId, status: 'pending' } }),
    prisma.listing.count({ where: { userId, status: 'rejected' } }),
    prisma.listing.aggregate({ where: { userId }, _sum: { viewCount: true, favoritesCount: true } }),
    prisma.favorite.count({ where: { userId } }),
  ]);
  res.json({
    totalListings,
    activeListings,
    approvedListings: activeListings,
    pendingListings,
    rejectedListings,
    views: listingsAgg._sum.viewCount || 0,
    favorites: listingsAgg._sum.favoritesCount || favoriteCount || 0,
    totalViews: listingsAgg._sum.viewCount || 0,
    totalFavorites: listingsAgg._sum.favoritesCount || favoriteCount || 0,
    savedFavorites: favoriteCount,
  });
}));

router.get('/stats', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const [totalUsers, totalListings, pendingListings, approvedListings, rejectedListings, projectsCount, vacanciesCount, applicationsCount, adsAggregate, activeAds] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.listing.count({ where: { status: 'pending' } }),
    prisma.listing.count({ where: { status: 'approved' } }),
    prisma.listing.count({ where: { status: 'rejected' } }),
    prisma.project.count(),
    prisma.vacancy.count(),
    prisma.application.count(),
    prisma.siteAd.aggregate({ _count: { id: true }, _sum: { viewCount: true, clickCount: true } }),
    prisma.siteAd.count({ where: activeAdWhere() }),
  ]);
  res.json({
    totalUsers,
    totalListings,
    pendingListings,
    approvedListings,
    rejectedListings,
    projectsCount,
    vacanciesCount,
    applicationsCount,
    totalAds: adsAggregate._count.id || 0,
    activeAds,
    totalViews: adsAggregate._sum.viewCount || 0,
    totalClicks: adsAggregate._sum.clickCount || 0,
  });
}));

module.exports = router;
