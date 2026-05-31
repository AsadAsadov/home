const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const { makeUniqueSlug, normalizeManualSlug } = require('../utils/seo');
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

function orderedProjectRows(rows) {
  return [...rows].sort((a, b) => (a.displayOrder ?? a.id) - (b.displayOrder ?? b.id) || a.id - b.id);
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
  const clauses = [];
  if (q) clauses.push({ OR: [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] });
  const yearClause = deliveryYearWhere(req.query.deliveryYear);
  if (yearClause) clauses.push(yearClause);
  const where = clauses.length ? { AND: clauses } : undefined;
  const [data, total] = await Promise.all([
    prisma.project.findMany({ where, orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], skip, take }),
    prisma.project.count({ where }),
  ]);
  res.json({ data: orderedProjectRows(data), total, page, totalPages: Math.max(Math.ceil(total / limit), 1) });
}));

router.put('/reorder', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const items = parseProjectOrder(req.body);
  if (!items.length) return res.status(400).json({ message: 'Project order array is required.' });

  const uniqueIds = new Set(items.map((item) => item.id));
  if (uniqueIds.size !== items.length) return res.status(400).json({ message: 'Project IDs must be unique.' });

  await prisma.$transaction(items.map((item) => (
    prisma.project.update({ where: { id: item.id }, data: { displayOrder: item.displayOrder } })
  )));

  const data = await prisma.project.findMany({ orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] });
  res.json({ ok: true, data: orderedProjectRows(data) });
}));

router.get('/slug/:slug', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').trim();
  const data = await prisma.project.findUnique({ where: { slug } });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  return res.json(data);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await prisma.project.findUnique({ where: { id: Number(req.params.id) } });
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
