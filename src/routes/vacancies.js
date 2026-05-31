const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const { makeUniqueSlug, normalizeManualSlug } = require('../utils/seo');
const router = express.Router();

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { req.auth = jwt.verify(token, process.env.JWT_SECRET); } catch (_error) { /* public read falls back to active-only */ }
  }
  next();
}

function canManage(req) {
  return ['admin'].includes(req.auth?.role);
}

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const data = await prisma.vacancy.findMany({
    where: canManage(req) ? undefined : { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(data);
}));

router.get('/slug/:slug', optionalAuth, asyncHandler(async (req, res) => {
  const data = await prisma.vacancy.findFirst({
    where: { slug: String(req.params.slug || '').trim(), ...(canManage(req) ? {} : { isActive: true }) },
  });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  return res.json(data);
}));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const data = await prisma.vacancy.findFirst({
    where: { id: Number(req.params.id), ...(canManage(req) ? {} : { isActive: true }) },
  });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  return res.json(data);
}));

router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const data = compact(serializers.vacancy(req.body));
  if (!data.title) return res.status(400).json({ message: 'Vacancy title is required.' });
  const created = await prisma.$transaction(async (tx) => {
    const manualSlug = normalizeManualSlug(data.slug);
    data.slug = manualSlug
      ? await makeUniqueSlug({ model: 'vacancy', title: manualSlug, tx, fallback: 'vacancy' })
      : await makeUniqueSlug({ model: 'vacancy', title: data.title, tx, fallback: 'vacancy' });
    return tx.vacancy.create({ data });
  });
  res.status(201).json(created);
}));

router.patch('/:id/toggle', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const vacancy = await prisma.vacancy.findUnique({ where: { id: Number(req.params.id) } });
  if (!vacancy) return res.status(404).json({ message: 'Record not found.' });
  const updated = await prisma.vacancy.update({ where: { id: vacancy.id }, data: { isActive: !vacancy.isActive } });
  res.json(updated);
}));

router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const data = compact(serializers.vacancy(req.body));
  if (Object.prototype.hasOwnProperty.call(data, 'slug')) {
    const slug = normalizeManualSlug(data.slug);
    if (!slug) delete data.slug;
    else data.slug = await makeUniqueSlug({ model: 'vacancy', title: slug, currentId: Number(req.params.id), tx: prisma, fallback: 'vacancy' });
  }
  const updated = await prisma.vacancy.update({ where: { id: Number(req.params.id) }, data });
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.vacancy.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
