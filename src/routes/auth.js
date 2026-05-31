const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, signToken, tokenExpiresAt } = require('../middleware/auth');
const { logUserActivity } = require('../utils/activity');

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

function requestIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
}

async function createSession(req, user, token) {
  try {
    await prisma.userSession.create({
      data: {
        userId: Number(user.id),
        token,
        ipAddress: requestIp(req),
        userAgent: req.headers['user-agent'] || null,
        expiresAt: tokenExpiresAt(token),
      },
    });
  } catch (error) {
    if (!['P2021', 'P2022'].includes(error.code)) throw error;
  }
}

async function issueAuthResponse(req, res, user, status = 200) {
  const token = signToken(tokenPayload(user));
  await createSession(req, user, token);
  return res.status(status).json({ token, user: publicUser(user) });
}

router.post('/register', asyncHandler(async (req, res) => {
  const fullname = clean(req.body.fullname);
  const email = clean(req.body.email)?.toLowerCase();
  const phone = clean(req.body.phone);
  const password = clean(req.body.password);
  if (!fullname || !email || !phone || !password) return res.status(400).json({ message: 'fullname, phone, email and password are required.' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { fullname, email, phone, passwordHash, role: 'user' } });
  await logUserActivity(prisma, user.id, 'register');
  return issueAuthResponse(req, res, user, 201);
}));

router.post('/login', asyncHandler(async (req, res) => {
  const email = clean(req.body.email)?.toLowerCase();
  const password = String(req.body.password || '');
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  if (user.isActive === false) return res.status(403).json({ message: 'User account is blocked.' });
  const updatedUser = await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  await logUserActivity(prisma, user.id, 'login');
  return issueAuthResponse(req, res, updatedUser);
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  if (req.authToken) {
    await prisma.userSession.deleteMany({ where: { token: req.authToken } }).catch((error) => {
      if (!['P2021', 'P2022'].includes(error.code)) throw error;
    });
  }
  await logUserActivity(prisma, req.auth.id, 'logout');
  res.json({ ok: true });
}));

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const email = clean(req.body.email)?.toLowerCase();
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) await logUserActivity(prisma, user.id, 'forgot_password');
  }
  res.json({ ok: true, message: 'If the email exists, password reset instructions will be sent.' });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: Number(req.auth.id) } });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user: publicUser(user) });
}));

router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const data = {
    fullname: clean(req.body.fullname),
    email: clean(req.body.email)?.toLowerCase(),
    avatarUrl: clean(req.body.avatar_url ?? req.body.avatarUrl),
  };
  if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) data.phone = clean(req.body.phone) ?? null;
  const compactData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  const user = await prisma.user.update({ where: { id: Number(req.auth.id) }, data: compactData });
  const token = signToken(tokenPayload(user));
  await logUserActivity(prisma, user.id, 'update_profile');
  res.json({ token, user: publicUser(user) });
}));

router.put('/me/password', authenticate, asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.current_password ?? req.body.currentPassword ?? '');
  const newPassword = clean(req.body.new_password ?? req.body.newPassword ?? req.body.password);
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters.' });
  const user = await prisma.user.findUnique({ where: { id: Number(req.auth.id) } });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (currentPassword && !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ message: 'Current password is incorrect.' });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  await logUserActivity(prisma, user.id, 'change_password');
  res.json({ ok: true });
}));

module.exports = router;
