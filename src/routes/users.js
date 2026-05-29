const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

function publicUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function clean(value) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}

function data(body) {
  const role = clean(body.role);
  const out = { fullname: clean(body.fullname), email: clean(body.email), role: ['admin', 'user'].includes(role) ? role : undefined };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

router.get('/', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(users.map(publicUser));
}));

router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const nextData = data(req.body);
  if (!nextData.fullname || !nextData.email) return res.status(400).json({ message: 'fullname and email are required.' });
  const passwordHash = await bcrypt.hash(req.body.password || 'BestHome123!', 12);
  const user = await prisma.user.create({ data: { ...nextData, passwordHash } });
  res.status(201).json(publicUser(user));
}));

router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const nextData = data(req.body);
  if (req.body.password && String(req.body.password).trim()) nextData.passwordHash = await bcrypt.hash(String(req.body.password).trim(), 12);
  const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: nextData });
  res.json(publicUser(user));
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
