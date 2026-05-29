const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const router = express.Router();

const include = { user: { select: { id: true, fullname: true, email: true, role: true } } };

function pagination(query) {
  const page = Math.max(Number.parseInt(query.page || '1', 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit || '20', 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const where = q ? { OR: [
    { title: { contains: q, mode: 'insensitive' } },
    { projectName: { contains: q, mode: 'insensitive' } },
    { description: { contains: q, mode: 'insensitive' } },
  ] } : undefined;
  const { page, limit, skip, take } = pagination(req.query);
  const [data, total] = await Promise.all([
    prisma.listing.findMany({ where, orderBy: { createdAt: 'desc' }, include, skip, take }),
    prisma.listing.count({ where }),
  ]);
  res.json({ data, total, page, totalPages: Math.max(Math.ceil(total / limit), 1) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await prisma.listing.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  return res.json(data);
}));

router.post('/', authenticate, authorize('admin', 'user'), asyncHandler(async (req, res) => {
  const data = compact(serializers.listing(req.body, req));
  if (req.auth.role === 'user') data.userId = req.auth.id;
  if (!data.title) return res.status(400).json({ message: 'Listing title is required.' });
  const created = await prisma.listing.create({ data, include });
  res.status(201).json(created);
}));

router.put('/:id', authenticate, authorize('admin', 'user'), asyncHandler(async (req, res) => {
  const existing = await prisma.listing.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: 'Record not found.' });
  if (req.auth.role === 'user' && existing.userId !== req.auth.id) return res.status(403).json({ message: 'You do not have permission for this action.' });
  const data = compact(serializers.listing(req.body, req));
  if (req.auth.role === 'user') data.userId = req.auth.id;
  const updated = await prisma.listing.update({ where: { id: Number(req.params.id) }, data, include });
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin', 'user'), asyncHandler(async (req, res) => {
  const existing = await prisma.listing.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: 'Record not found.' });
  if (req.auth.role === 'user' && existing.userId !== req.auth.id) return res.status(403).json({ message: 'You do not have permission for this action.' });
  await prisma.listing.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
