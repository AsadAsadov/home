const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const where = q ? { title: { contains: q, mode: 'insensitive' } } : undefined;
  const data = await prisma.project.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(data);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await prisma.project.findUnique({ where: { id: Number(req.params.id) } });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  return res.json(data);
}));

router.post('/', authenticate, authorize('admin', 'employee'), asyncHandler(async (req, res) => {
  const created = await prisma.project.create({ data: compact(serializers.project(req.body)) });
  res.status(201).json(created);
}));

router.put('/:id', authenticate, authorize('admin', 'employee'), asyncHandler(async (req, res) => {
  const updated = await prisma.project.update({ where: { id: Number(req.params.id) }, data: compact(serializers.project(req.body)) });
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin', 'employee'), asyncHandler(async (req, res) => {
  await prisma.project.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
