const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const [totalUsers, totalListings, pendingListings, approvedListings, rejectedListings, projectsCount, vacanciesCount, applicationsCount] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.listing.count({ where: { status: 'pending' } }),
    prisma.listing.count({ where: { status: 'approved' } }),
    prisma.listing.count({ where: { status: 'rejected' } }),
    prisma.project.count(),
    prisma.vacancy.count(),
    prisma.application.count(),
  ]);
  res.json({ totalUsers, totalListings, pendingListings, approvedListings, rejectedListings, projectsCount, vacanciesCount, applicationsCount });
}));

module.exports = router;
