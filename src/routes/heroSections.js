const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function heroPayload(body = {}) {
  return {
    badgeText: body.badge_text ?? body.badgeText ?? '',
    title: body.title ?? '',
    description: body.description ?? '',
    heroImageUrl: body.hero_image_url ?? body.heroImageUrl ?? '',
    isActive: body.is_active ?? body.isActive ?? true,
  };
}

router.get('/:pageKey', asyncHandler(async (req, res) => {
  const pageKey = String(req.params.pageKey || '').trim();
  if (!pageKey) return res.status(400).json({ message: 'page_key is required.' });

  const hero = await prisma.heroSection.findFirst({
    where: { pageKey, isActive: true },
    orderBy: { id: 'asc' },
  });

  if (!hero) return res.status(404).json({ message: 'Hero section not found.' });
  return res.json(hero);
}));

router.put('/:pageKey', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const pageKey = String(req.params.pageKey || '').trim();
  if (!pageKey) return res.status(400).json({ message: 'page_key is required.' });

  const existing = await prisma.heroSection.findFirst({
    where: { pageKey },
    orderBy: { id: 'asc' },
  });

  const data = heroPayload(req.body);
  const saved = existing
    ? await prisma.heroSection.update({ where: { id: existing.id }, data })
    : await prisma.heroSection.create({ data: { pageKey, ...data } });

  return res.json(saved);
}));

module.exports = router;
