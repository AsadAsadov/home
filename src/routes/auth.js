const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
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

function serializeAuthError(error) {
  return {
    message: error.message,
    name: error.name,
    code: error.code,
    meta: error.meta,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  };
}

function authLog(label, details = {}) {
  console.log(label, details);
}

function authErrorLog(error, details = {}) {
  console.error('AUTH ERROR', { ...details, error: serializeAuthError(error) });
}

function authErrorStatus(error) {
  if (error.status) return error.status;
  if (error.code === 'P2002') return 409;
  if (error.code === 'P2025') return 404;
  return 500;
}

function authJsonError(res, error) {
  const status = authErrorStatus(error);
  const message = error.code === 'P2002'
    ? `Duplicate value for ${Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'unique field'}.`
    : error.message;

  return res.status(status).json({
    success: false,
    error: message,
    message,
    details: {
      name: error.name,
      code: error.code,
      meta: error.meta,
    },
  });
}

function authRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      authErrorLog(error, { path: req.originalUrl, method: req.method });
      return authJsonError(res, error);
    }
  };
}

async function createSession(req, user, token) {
  const sessionData = {
    userId: Number(user.id),
    token,
    ipAddress: requestIp(req),
    userAgent: req.headers['user-agent'] || null,
    expiresAt: tokenExpiresAt(token),
  };

  authLog('AUTH SESSION CREATE START', {
    user_id: sessionData.userId,
    ip_address: sessionData.ipAddress,
    user_agent: sessionData.userAgent,
    expires_at: sessionData.expiresAt,
  });

  const session = await prisma.userSession.create({ data: sessionData });

  authLog('AUTH SESSION CREATED', {
    id: session.id,
    user_id: session.userId,
    expires_at: session.expiresAt,
  });

  return session;
}

async function issueAuthResponse(req, res, user, status = 200) {
  authLog('AUTH JWT GENERATION START', { user_id: user.id, email: user.email, role: user.role });
  const token = signToken(tokenPayload(user));
  authLog('AUTH JWT GENERATION SUCCESS', { user_id: user.id, expires_at: tokenExpiresAt(token) });
  await createSession(req, user, token);
  return res.status(status).json({ success: true, token, user: publicUser(user) });
}

router.post('/register', authRoute(async (req, res) => {
  authLog('AUTH REGISTER START', { email: clean(req.body.email)?.toLowerCase(), has_password: Boolean(req.body.password) });
  const fullname = clean(req.body.fullname);
  const email = clean(req.body.email)?.toLowerCase();
  const phone = clean(req.body.phone);
  const password = clean(req.body.password);
  if (!fullname || !email || !phone || !password) return res.status(400).json({ success: false, error: 'fullname, phone, email and password are required.', message: 'fullname, phone, email and password are required.' });
  if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.', message: 'Password must be at least 6 characters.' });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(409).json({ success: false, error: 'Email is already registered.', message: 'Email is already registered.' });

  authLog('AUTH BCRYPT HASH START', { email });
  const passwordHash = await bcrypt.hash(password, 12);
  authLog('AUTH BCRYPT HASH SUCCESS', { email });

  authLog('AUTH USER CREATE START', { email, fullname, phone });
  const user = await prisma.user.create({ data: { fullname, email, phone, passwordHash, role: 'user' } });
  authLog('AUTH USER CREATE SUCCESS', { user_id: user.id, email: user.email });

  await logUserActivity(prisma, user.id, 'register');
  authLog('AUTH ACTIVITY LOG CREATED', { user_id: user.id, action: 'register' });

  const response = await issueAuthResponse(req, res, user, 201);
  authLog('AUTH REGISTER SUCCESS', { user_id: user.id, email: user.email });
  return response;
}));

router.post('/login', authRoute(async (req, res) => {
  const email = clean(req.body.email)?.toLowerCase();
  const password = String(req.body.password || '');
  authLog('AUTH LOGIN START', { email, has_password: Boolean(password) });

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  authLog('AUTH USER LOOKUP RESULT', { email, found: Boolean(user), user_id: user?.id, is_active: user?.isActive, email_verified: user?.emailVerified });

  if (!user) return res.status(401).json({ success: false, error: 'Invalid email or password.', message: 'Invalid email or password.' });

  authLog('AUTH BCRYPT COMPARE START', { user_id: user.id, email });
  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  authLog('AUTH BCRYPT COMPARE SUCCESS', { user_id: user.id, email, password_matches: passwordMatches });

  if (!passwordMatches) return res.status(401).json({ success: false, error: 'Invalid email or password.', message: 'Invalid email or password.' });
  if (user.isActive === false) return res.status(403).json({ success: false, error: 'User account is blocked.', message: 'User account is blocked.' });

  authLog('AUTH LAST LOGIN UPDATE START', { user_id: user.id });
  const updatedUser = await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  authLog('AUTH LAST LOGIN UPDATE SUCCESS', { user_id: user.id });

  await logUserActivity(prisma, user.id, 'login');
  authLog('AUTH ACTIVITY LOG CREATED', { user_id: user.id, action: 'login' });

  const response = await issueAuthResponse(req, res, updatedUser);
  authLog('AUTH LOGIN SUCCESS', { user_id: user.id, email: user.email });
  return response;
}));

router.post('/logout', authenticate, authRoute(async (req, res) => {
  if (req.authToken) {
    await prisma.userSession.deleteMany({ where: { token: req.authToken } });
  }
  await logUserActivity(prisma, req.auth.id, 'logout');
  res.json({ success: true, ok: true });
}));

router.post('/forgot-password', authRoute(async (req, res) => {
  const email = clean(req.body.email)?.toLowerCase();
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) await logUserActivity(prisma, user.id, 'forgot_password');
  }
  res.json({ success: true, ok: true, message: 'If the email exists, password reset instructions will be sent.' });
}));

router.get('/me', authenticate, authRoute(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: Number(req.auth.id) } });
  if (!user) return res.status(404).json({ success: false, error: 'User not found.', message: 'User not found.' });
  res.json({ success: true, user: publicUser(user) });
}));

router.put('/me', authenticate, authRoute(async (req, res) => {
  const data = {
    fullname: clean(req.body.fullname),
    avatarUrl: clean(req.body.avatar_url ?? req.body.avatarUrl),
    bio: clean(req.body.bio),
  };
  if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) data.phone = clean(req.body.phone) ?? null;
  const compactData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  const user = await prisma.user.update({ where: { id: Number(req.auth.id) }, data: compactData });
  const token = signToken(tokenPayload(user));
  await logUserActivity(prisma, user.id, 'update_profile');
  res.json({ success: true, token, user: publicUser(user) });
}));

router.put('/me/password', authenticate, authRoute(async (req, res) => {
  const currentPassword = String(req.body.current_password ?? req.body.currentPassword ?? '');
  const newPassword = clean(req.body.new_password ?? req.body.newPassword ?? req.body.password);
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.', message: 'New password must be at least 6 characters.' });
  const user = await prisma.user.findUnique({ where: { id: Number(req.auth.id) } });
  if (!user) return res.status(404).json({ success: false, error: 'User not found.', message: 'User not found.' });
  if (currentPassword && !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ success: false, error: 'Current password is incorrect.', message: 'Current password is incorrect.' });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  await logUserActivity(prisma, user.id, 'change_password');
  res.json({ success: true, ok: true });
}));

module.exports = router;
