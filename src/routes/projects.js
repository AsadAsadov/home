const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
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

router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { page, limit, skip, take } = pagination(req.query);
  const clauses = [];
  if (q) clauses.push({ title: { contains: q, mode: 'insensitive' } });
  const yearClause = deliveryYearWhere(req.query.deliveryYear);
  if (yearClause) clauses.push(yearClause);
  const where = clauses.length ? { AND: clauses } : undefined;
  const [data, total] = await Promise.all([
    prisma.project.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.project.count({ where }),
  ]);
  res.json({ data, total, page, totalPages: Math.max(Math.ceil(total / limit), 1) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await prisma.project.findUnique({ where: { id: Number(req.params.id) } });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  return res.json(data);
}));

router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const payload = compact(serializers.project(req.body));
  if (!payload.title) return res.status(400).json({ message: 'Project title is required.' });
  const created = await prisma.project.create({ data: payload });
  res.status(201).json(created);
}));

router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const payload = compact(serializers.project(req.body));
  const updated = await prisma.project.update({ where: { id: Number(req.params.id) }, data: payload });
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.project.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
