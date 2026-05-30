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

function serializeHeroSection(hero) {
  return {
    ...hero,
    page_key: hero.pageKey,
    badge_text: hero.badgeText,
    hero_image_url: hero.heroImageUrl,
    is_active: hero.isActive,
  };
}

function logHeroSectionError(req, error) {
  console.error(`[hero-sections] ${req.method} ${req.originalUrl} failed`, {
    pageKey: req.params.pageKey,
    body: req.body,
  });
  console.error(error?.stack || error);
}

router.get('/:pageKey', asyncHandler(async (req, res) => {
  const pageKey = String(req.params.pageKey || '').trim();
  if (!pageKey) return res.status(400).json({ message: 'page_key is required.' });

  try {
    const hero = await prisma.heroSection.findUnique({
      where: { pageKey },
    });

    if (!hero || !hero.isActive) return res.status(404).json({ message: 'Hero section not found.' });
    return res.json(serializeHeroSection(hero));
  } catch (error) {
    logHeroSectionError(req, error);
    return res.status(500).json({
      message: error.message || 'Hero section could not be loaded.',
      code: error.code,
      meta: error.meta,
    });
  }
}));

router.put('/:pageKey', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const pageKey = String(req.params.pageKey || '').trim();
  if (!pageKey) return res.status(400).json({ message: 'page_key is required.' });

  const data = heroPayload(req.body);

  try {
    const saved = await prisma.heroSection.upsert({
      where: { pageKey },
      update: data,
      create: { pageKey, ...data },
    });

    return res.json(serializeHeroSection(saved));
  } catch (error) {
    logHeroSectionError(req, error);
    return res.status(500).json({
      message: error.message || 'Hero section could not be saved.',
      code: error.code,
      meta: error.meta,
    });
  }
}));

module.exports = router;
