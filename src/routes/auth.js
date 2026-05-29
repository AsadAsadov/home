const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', asyncHandler(async (req, res) => {
  const { fullname, email, password } = req.body;
  if (!fullname || !email || !password) return res.status(400).json({ message: 'fullname, email and password are required.' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { fullname, email, passwordHash, role: 'user' } });
  const token = signToken({ id: user.id, email: user.email, role: user.role, fullname: user.fullname, type: 'user' });
  res.status(201).json({ token, user: { id: user.id, fullname: user.fullname, email: user.email, role: user.role } });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && await bcrypt.compare(password, user.passwordHash)) {
    const token = signToken({ id: user.id, email: user.email, role: user.role, fullname: user.fullname, type: 'user' });
    return res.json({ token, user: { id: user.id, fullname: user.fullname, email: user.email, role: user.role } });
  }

  return res.status(401).json({ message: 'Invalid email or password.' });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ user: req.auth });
}));

module.exports = router;
