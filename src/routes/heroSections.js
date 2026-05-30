const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function sanitizeColor(value, fallback) {
  const color = String(value || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : fallback;
}

function sanitizeOpacity(value, fallback = 0.35) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), 1);
}

function heroPayload(body = {}) {
  return {
    badgeText: body.badge_text ?? body.badgeText ?? '',
    title: body.title ?? '',
    description: body.description ?? '',
    heroImageUrl: body.hero_image_url ?? body.heroImageUrl ?? '',
    badgeColor: sanitizeColor(body.badge_color ?? body.badgeColor, '#7F7FFF'),
    titleColor: sanitizeColor(body.title_color ?? body.titleColor, '#111827'),
    descriptionColor: sanitizeColor(body.description_color ?? body.descriptionColor, '#374151'),
    overlayColor: sanitizeColor(body.overlay_color ?? body.overlayColor, '#000000'),
    overlayOpacity: sanitizeOpacity(body.overlay_opacity ?? body.overlayOpacity),
    buttonColor: sanitizeColor(body.button_color ?? body.buttonColor, '#7F7FFF'),
    buttonTextColor: sanitizeColor(body.button_text_color ?? body.buttonTextColor, '#FFFFFF'),
    isActive: body.is_active ?? body.isActive ?? true,
  };
}

function serializeHeroSection(hero) {
  return {
    ...hero,
    page_key: hero.pageKey,
    badge_text: hero.badgeText,
    hero_image_url: hero.heroImageUrl,
    badge_color: hero.badgeColor,
    title_color: hero.titleColor,
    description_color: hero.descriptionColor,
    overlay_color: hero.overlayColor,
    overlay_opacity: hero.overlayOpacity == null ? undefined : Number(hero.overlayOpacity),
    button_color: hero.buttonColor,
    button_text_color: hero.buttonTextColor,
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
