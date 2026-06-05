const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const { makeUniqueSlug, normalizeManualSlug } = require('../utils/seo');
const { projectImportPreview, upsertProjectImports } = require('../utils/projectBulkImport');
const { orderedProjectRows, projectOrderBy } = require('../utils/projectOrdering');
const router = express.Router();

function pagination(query) {
  const page = Math.max(Number.parseInt(query.page || '1', 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit || '20', 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

function deliveryYearWhere(year) {
  if (!year) return undefined;
  const value = String(year).trim();
  if (!/^\d{4}$/.test(value)) return undefined;
  return { deliveryDate: { contains: value, mode: 'insensitive' } };
}

function legacyOrderedProjectRows(rows) {
  return [...rows].sort((a, b) => (a.displayOrder ?? a.id) - (b.displayOrder ?? b.id) || a.id - b.id);
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseProjectOrder(body) {
  const raw = Array.isArray(body?.order) ? body.order : (Array.isArray(body?.projects) ? body.projects : []);
  return raw
    .map((item, index) => ({
      id: Number.parseInt(typeof item === 'object' ? item.id : item, 10),
      displayOrder: Number.parseInt(typeof item === 'object' && item.displayOrder != null ? item.displayOrder : index + 1, 10),
    }))
    .filter((item) => Number.isInteger(item.id) && item.id > 0 && Number.isInteger(item.displayOrder));
}

router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { page, limit, skip, take } = pagination(req.query);
  const returnAll = String(req.query.all || '').toLowerCase() === 'true';
  const clauses = [{ isArchived: false }];
  if (q) clauses.push({ OR: [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] });
  const yearClause = deliveryYearWhere(req.query.deliveryYear);
  if (yearClause) clauses.push(yearClause);
  const where = { AND: clauses };
  const [data, total] = await Promise.all([
    prisma.project.findMany({ where, orderBy: projectOrderBy, ...(returnAll ? {} : { skip, take }) }),
    prisma.project.count({ where }),
  ]);
  res.json({ data: orderedProjectRows(data), total, page: returnAll ? 1 : page, totalPages: returnAll ? 1 : Math.max(Math.ceil(total / limit), 1) });
}));

router.post('/bulk/preview', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body?.projects) ? req.body.projects : [];
  const projects = await prisma.project.findMany({ orderBy: { id: 'asc' } });
  res.json({ rows: projectImportPreview(rows, projects) });
}));

router.post('/bulk', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body?.projects) ? req.body.projects : [];
  const result = await prisma.$transaction((tx) => upsertProjectImports(tx, rows));
  res.json(result);
}));

router.put('/reorder', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const items = parseProjectOrder(req.body);
  if (!items.length) return res.status(400).json({ message: 'Project order array is required.' });

  const uniqueIds = new Set(items.map((item) => item.id));
  if (uniqueIds.size !== items.length) return res.status(400).json({ message: 'Project IDs must be unique.' });

  await prisma.$transaction(items.map((item) => (
    prisma.project.update({ where: { id: item.id }, data: { displayOrder: item.displayOrder } })
  )));

  const data = await prisma.project.findMany({ where: { isArchived: false }, orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] });
  res.json({ ok: true, data: legacyOrderedProjectRows(data) });
}));


router.get('/archived', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const data = await prisma.project.findMany({
    where: { isArchived: true },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
  });
  res.json(legacyOrderedProjectRows(data));
}));

router.patch('/:id/archive', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const archiveValue = req.body?.isArchived ?? req.body?.is_archived;
  if (archiveValue === undefined || archiveValue === null || archiveValue === '') {
    return res.status(400).json({ message: 'isArchived is required.' });
  }
  const isArchived = parseBool(archiveValue);
  const updated = await prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: Number(req.params.id) },
      data: { isArchived, ...(isArchived ? { featuredInHero: false } : {}) },
    });
    if (isArchived) {
      await tx.heroSlide.updateMany({ where: { projectId: project.id }, data: { isActive: false } });
    }
    return project;
  });
  res.json(updated);
}));


router.patch('/:id/hero', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const updated = await prisma.project.update({
    where: { id: Number(req.params.id) },
    data: { featuredInHero: parseBool(req.body?.featured_in_hero ?? req.body?.featuredInHero) },
  });
  res.json(updated);
}));

router.get('/slug/:slug', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').trim();
  const data = await prisma.project.findFirst({ where: { slug, isArchived: false } });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  return res.json(data);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await prisma.project.findFirst({ where: { id: Number(req.params.id), isArchived: false } });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  return res.json(data);
}));

router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const payload = compact(serializers.project(req.body));
  if (!payload.title) return res.status(400).json({ message: 'Project title is required.' });
  const created = await prisma.$transaction(async (tx) => {
    const manualSlug = normalizeManualSlug(payload.slug);
    payload.slug = manualSlug
      ? await makeUniqueSlug({ model: 'project', title: manualSlug, tx, fallback: 'project' })
      : await makeUniqueSlug({ model: 'project', title: payload.title, tx, fallback: 'project' });
    const project = await tx.project.create({ data: payload });
    if (project.displayOrder == null) {
      return tx.project.update({ where: { id: project.id }, data: { displayOrder: project.id } });
    }
    return project;
  });
  res.status(201).json(created);
}));

router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const payload = compact(serializers.project(req.body));
  if (Object.prototype.hasOwnProperty.call(payload, 'slug')) {
    const slug = normalizeManualSlug(payload.slug);
    if (!slug) delete payload.slug;
    else payload.slug = await makeUniqueSlug({ model: 'project', title: slug, currentId: Number(req.params.id), tx: prisma, fallback: 'project' });
  }
  const updated = await prisma.project.update({ where: { id: Number(req.params.id) }, data: payload });
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.project.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
