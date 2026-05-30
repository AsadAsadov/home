const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, signToken } = require('../middleware/auth');

const router = express.Router();

function clean(value) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function tokenPayload(user) {
  return { id: user.id, email: user.email, role: user.role, fullname: user.fullname, phone: user.phone || null, type: 'user' };
}

router.post('/register', asyncHandler(async (req, res) => {
  const { fullname, email, password } = req.body;
  const phone = clean(req.body.phone);
  if (!fullname || !email || !password) return res.status(400).json({ message: 'fullname, email and password are required.' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { fullname, email, phone, passwordHash, role: 'user' } });
  const token = signToken(tokenPayload(user));
  res.status(201).json({ token, user: publicUser(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && await bcrypt.compare(password, user.passwordHash)) {
    const token = signToken(tokenPayload(user));
    return res.json({ token, user: publicUser(user) });
  }

  return res.status(401).json({ message: 'Invalid email or password.' });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: Number(req.auth.id) } });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user: publicUser(user) });
}));

router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const data = {
    fullname: clean(req.body.fullname),
    email: clean(req.body.email),
  };
  if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) data.phone = clean(req.body.phone) ?? null;
  const compactData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  if (req.body.password && String(req.body.password).trim()) compactData.passwordHash = await bcrypt.hash(String(req.body.password).trim(), 12);
  const user = await prisma.user.update({ where: { id: Number(req.auth.id) }, data: compactData });
  const token = signToken(tokenPayload(user));
  res.json({ token, user: publicUser(user) });
}));

module.exports = router;
