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
  const normalized = {
    ...DEFAULT_SITE_SETTINGS,
    showBaki: settings.showBaki ?? settings.show_baki ?? DEFAULT_SITE_SETTINGS.showBaki,
    showSumqayit: settings.showSumqayit ?? settings.show_sumqayit ?? DEFAULT_SITE_SETTINGS.showSumqayit,
    showAbsheron: settings.showAbsheron ?? settings.show_absheron ?? DEFAULT_SITE_SETTINGS.showAbsheron,
    showMetroFilter: settings.showMetroFilter ?? settings.show_metro_filter ?? DEFAULT_SITE_SETTINGS.showMetroFilter,
    showRayonFilter: settings.showRayonFilter ?? settings.show_rayon_filter ?? DEFAULT_SITE_SETTINGS.showRayonFilter,
    showQesebeFilter: settings.showQesebeFilter ?? settings.show_qesebe_filter ?? DEFAULT_SITE_SETTINGS.showQesebeFilter,
  };

  return {
    ...normalized,
    show_baki: normalized.showBaki,
    show_sumqayit: normalized.showSumqayit,
    show_absheron: normalized.showAbsheron,
    show_metro_filter: normalized.showMetroFilter,
    show_rayon_filter: normalized.showRayonFilter,
    show_qesebe_filter: normalized.showQesebeFilter,
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

function canUseSiteSettingsModel() {
  return Boolean(prisma.siteSettings?.findUnique && prisma.siteSettings?.upsert);
}

async function readSettingsWithPrismaModel() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  return settings ? serialize(settings) : serialize(DEFAULT_SITE_SETTINGS);
}

async function readSettingsWithRawSql() {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      show_baki,
      show_sumqayit,
      show_absheron,
      show_metro_filter,
      show_rayon_filter,
      show_qesebe_filter,
      updated_at
    FROM site_settings
    WHERE id = ${1}
    LIMIT 1
  `;
  return rows?.[0] ? serialize(rows[0]) : serialize(DEFAULT_SITE_SETTINGS);
}

async function writeSettingsWithPrismaModel(data) {
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  return serialize(settings);
}

async function writeSettingsWithRawSql(data) {
  await prisma.$executeRaw`
    INSERT INTO site_settings (
      id,
      show_baki,
      show_sumqayit,
      show_absheron,
      show_metro_filter,
      show_rayon_filter,
      show_qesebe_filter
    ) VALUES (
      ${1},
      ${data.showBaki},
      ${data.showSumqayit},
      ${data.showAbsheron},
      ${data.showMetroFilter},
      ${data.showRayonFilter},
      ${data.showQesebeFilter}
    )
    ON CONFLICT (id) DO UPDATE SET
      show_baki = EXCLUDED.show_baki,
      show_sumqayit = EXCLUDED.show_sumqayit,
      show_absheron = EXCLUDED.show_absheron,
      show_metro_filter = EXCLUDED.show_metro_filter,
      show_rayon_filter = EXCLUDED.show_rayon_filter,
      show_qesebe_filter = EXCLUDED.show_qesebe_filter,
      updated_at = now()
  `;
  return readSettingsWithRawSql();
}

async function readSettings() {
  if (canUseSiteSettingsModel()) return readSettingsWithPrismaModel();
  return readSettingsWithRawSql();
}

async function writeSettings(data) {
  if (canUseSiteSettingsModel()) return writeSettingsWithPrismaModel(data);
  return writeSettingsWithRawSql(data);
}

router.get('/', asyncHandler(async (_req, res) => {
  try {
    res.json(await readSettings());
  } catch (error) {
    console.error('[site-settings] Failed to read settings:', error);
    res.json(serialize(DEFAULT_SITE_SETTINGS));
  }
}));

router.put('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const current = await readSettings();
    const data = payload(req.body, current);
    const settings = await writeSettings(data);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('[site-settings] Failed to save settings:', error);
    res.status(500).json({ success: false, message: 'Site settings could not be saved.' });
  }
}));

module.exports = router;
