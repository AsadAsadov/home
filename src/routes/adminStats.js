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

router.get('/overview', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const [
    listingsTotal,
    listingsApproved,
    listingsPending,
    listingsRejected,
    listingsArchived,
    projectsTotal,
    galleryTotal,
    favoritesTotal,
    adsAggregate,
    adsActive,
    vacanciesTotal,
    applicationsTotal,
    usersTotal,
    projectAggregate,
    projectInquiriesTotal,
  ] = await Promise.all([
    prisma.listing.count(),
    prisma.listing.count({ where: { status: 'approved' } }),
    prisma.listing.count({ where: { status: 'pending' } }),
    prisma.listing.count({ where: { status: 'rejected' } }),
    prisma.listing.count({ where: { status: 'archived' } }),
    prisma.project.count(),
    prisma.gallery.count(),
    prisma.favorite.count(),
    prisma.siteAd.aggregate({ _count: { id: true }, _sum: { viewCount: true, clickCount: true } }),
    prisma.siteAd.count({ where: activeAdWhere() }),
    prisma.vacancy.count(),
    prisma.application.count(),
    prisma.user.count(),
    prisma.project.aggregate({ _sum: { viewCount: true, clickCount: true, inquiryCount: true } }),
    prisma.projectInquiry.count(),
  ]);

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    listingsTotal,
    listingsApproved,
    listingsPending,
    listingsRejected,
    listingsArchived,
    projectsTotal,
    galleryTotal,
    favoritesTotal,
    adsTotal: adsAggregate._count.id || 0,
    adsActive,
    adViews: adsAggregate._sum.viewCount || 0,
    adClicks: adsAggregate._sum.clickCount || 0,
    vacanciesTotal,
    applicationsTotal,
    usersTotal,
    totalUsers: usersTotal,
    totalProjectViews: projectAggregate._sum.viewCount || 0,
    totalProjectClicks: projectAggregate._sum.clickCount || 0,
    totalProjectInquiries: projectAggregate._sum.inquiryCount || projectInquiriesTotal || 0,
    projectInquiriesTotal,
  });
}));

module.exports = router;
