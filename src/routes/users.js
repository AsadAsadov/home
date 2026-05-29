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

function data(body) {
  const out = { fullname: body.fullname, email: body.email, role: body.role };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

router.get('/', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(users.map(publicUser));
}));

router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password || 'BestHome123!', 12);
  const user = await prisma.user.create({ data: { ...data(req.body), passwordHash } });
  res.status(201).json(publicUser(user));
}));

router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const nextData = data(req.body);
  if (req.body.password) nextData.passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: nextData });
  res.json(publicUser(user));
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
