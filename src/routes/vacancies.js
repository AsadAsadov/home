const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
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
  return ['admin', 'employee'].includes(req.auth?.role);
}

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const data = await prisma.vacancy.findMany({
    where: canManage(req) ? undefined : { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(data);
}));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const data = await prisma.vacancy.findFirst({
    where: { id: Number(req.params.id), ...(canManage(req) ? {} : { isActive: true }) },
  });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  return res.json(data);
}));

router.post('/', authenticate, authorize('admin', 'employee'), asyncHandler(async (req, res) => {
  const created = await prisma.vacancy.create({ data: compact(serializers.vacancy(req.body)) });
  res.status(201).json(created);
}));

router.patch('/:id/toggle', authenticate, authorize('admin', 'employee'), asyncHandler(async (req, res) => {
  const vacancy = await prisma.vacancy.findUnique({ where: { id: Number(req.params.id) } });
  if (!vacancy) return res.status(404).json({ message: 'Record not found.' });
  const updated = await prisma.vacancy.update({ where: { id: vacancy.id }, data: { isActive: !vacancy.isActive } });
  res.json(updated);
}));

router.put('/:id', authenticate, authorize('admin', 'employee'), asyncHandler(async (req, res) => {
  const updated = await prisma.vacancy.update({ where: { id: Number(req.params.id) }, data: compact(serializers.vacancy(req.body)) });
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin', 'employee'), asyncHandler(async (req, res) => {
  await prisma.vacancy.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
