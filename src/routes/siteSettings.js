const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_SITE_SETTINGS = {
  showBaki: true,
  showSumqayit: true,
  showAbsheron: true,
  showMetroFilter: true,
  showRayonFilter: true,
  showQesebeFilter: true,
};

function parseBool(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on', 'aktiv'].includes(String(value).toLowerCase());
}

function serialize(settings = {}) {
  return {
    ...DEFAULT_SITE_SETTINGS,
    ...settings,
    show_baki: settings.showBaki ?? DEFAULT_SITE_SETTINGS.showBaki,
    show_sumqayit: settings.showSumqayit ?? DEFAULT_SITE_SETTINGS.showSumqayit,
    show_absheron: settings.showAbsheron ?? DEFAULT_SITE_SETTINGS.showAbsheron,
    show_metro_filter: settings.showMetroFilter ?? DEFAULT_SITE_SETTINGS.showMetroFilter,
    show_rayon_filter: settings.showRayonFilter ?? DEFAULT_SITE_SETTINGS.showRayonFilter,
    show_qesebe_filter: settings.showQesebeFilter ?? DEFAULT_SITE_SETTINGS.showQesebeFilter,
  };
}

function payload(body = {}, existing = DEFAULT_SITE_SETTINGS) {
  return {
    showBaki: parseBool(body.showBaki ?? body.show_baki, existing.showBaki),
    showSumqayit: parseBool(body.showSumqayit ?? body.show_sumqayit, existing.showSumqayit),
    showAbsheron: parseBool(body.showAbsheron ?? body.show_absheron, existing.showAbsheron),
    showMetroFilter: parseBool(body.showMetroFilter ?? body.show_metro_filter, existing.showMetroFilter),
    showRayonFilter: parseBool(body.showRayonFilter ?? body.show_rayon_filter, existing.showRayonFilter),
    showQesebeFilter: parseBool(body.showQesebeFilter ?? body.show_qesebe_filter, existing.showQesebeFilter),
  };
}

async function readSettings() {
  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, ...DEFAULT_SITE_SETTINGS },
    });
    return serialize(settings);
  } catch (error) {
    if (['P2021', 'P2022'].includes(error.code)) return serialize(DEFAULT_SITE_SETTINGS);
    throw error;
  }
}

router.get('/', asyncHandler(async (_req, res) => {
  res.json(await readSettings());
}));

router.put('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const current = await readSettings();
  const data = payload(req.body, current);
  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    res.json(serialize(settings));
  } catch (error) {
    if (['P2021', 'P2022'].includes(error.code)) {
      error.status = 503;
      error.message = 'Site settings migration has not been applied yet.';
    }
    throw error;
  }
}));

module.exports = router;
