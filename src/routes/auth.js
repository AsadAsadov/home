const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate, signToken, tokenExpiresAt } = require('../middleware/auth');
const { logUserActivity } = require('../utils/activity');
const { sendEmail } = require('../utils/email');

const router = express.Router();

const VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 60;
const RESEND_VERIFICATION_WINDOW_MS = 60 * 1000;
const FORGOT_PASSWORD_WINDOW_MS = 60 * 60 * 1000;
const FORGOT_PASSWORD_LIMIT = 5;
const resendVerificationAttempts = new Map();
const forgotPasswordAttempts = new Map();

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

function appUrl(pathname, params = {}) {
  const baseUrl = (process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'https://besthome.az').replace(/\/$/, '');
  const url = new URL(pathname, `${baseUrl}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });
  return url.toString();
}

function appOrigin() {
  return new URL(appUrl('/')).origin;
}

function safeRedirect(value) {
  try {
    const url = new URL(value || '/', appOrigin());
    if (url.origin !== appOrigin()) return appUrl('/');
    return url.toString();
  } catch (_error) {
    return appUrl('/');
  }
}

function signGoogleState(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'besthome-google-state').update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyGoogleState(state) {
  const [body, signature] = String(state || '').split('.');
  if (!body || !signature) return {};
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'besthome-google-state').update(body).digest('base64url');
  if (signature.length !== expected.length) return {};
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return {};
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateTokenPair() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: tokenHash(token) };
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function rateLimitKey(prefix, value) {
  return `${prefix}:${String(value || '').toLowerCase()}`;
}

function hitFixedWindow(map, key, windowMs, limit) {
  const now = Date.now();
  const current = map.get(key);
  if (!current || current.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: now + windowMs };
  }
  if (current.count >= limit) return { allowed: false, remaining: 0, resetAt: current.resetAt };
  current.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
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

  const session = await prisma.userSession.create({ data: sessionData });
  authLog('AUTH SESSION CREATED', { id: session.id, user_id: session.userId, expires_at: session.expiresAt });
  return session;
}

async function issueAuthResponse(req, res, user, status = 200, extra = {}) {
  const token = signToken(tokenPayload(user));
  await createSession(req, user, token);
  return res.status(status).json({ success: true, token, user: publicUser(user), ...extra });
}

async function createEmailVerificationToken(userId, tx = prisma) {
  const { token, hash } = generateTokenPair();
  await tx.emailVerificationToken.create({
    data: {
      userId: Number(userId),
      token: hash,
      expiresAt: addHours(new Date(), VERIFICATION_TTL_HOURS),
    },
  });
  return token;
}

async function createPasswordResetToken(userId, tx = prisma) {
  const { token, hash } = generateTokenPair();
  await tx.passwordResetToken.create({
    data: {
      userId: Number(userId),
      token: hash,
      expiresAt: addMinutes(new Date(), PASSWORD_RESET_TTL_MINUTES),
    },
  });
  return token;
}

async function sendVerificationEmail(user) {
  const token = await createEmailVerificationToken(user.id);
  const url = appUrl('/verify-email', { token });
  await sendEmail({
    to: user.email,
    subject: 'Best Home hesabınızı təsdiqləyin',
    text: `Salam ${user.fullname}, Best Home hesabınızı təsdiqləmək üçün bu linkə keçin: ${url}`,
    html: `<p>Salam ${escapeHtml(user.fullname)},</p><p>Best Home hesabınızı təsdiqləmək üçün düyməyə klikləyin.</p><p><a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">📧 Emaili təsdiqlə</a></p><p>Link 24 saat qüvvədədir.</p>`,
  });
  return url;
}

async function sendPasswordResetEmail(user) {
  const token = await createPasswordResetToken(user.id);
  const url = appUrl('/reset-password', { token });
  await sendEmail({
    to: user.email,
    subject: 'Best Home şifrə bərpası',
    text: `Şifrənizi yeniləmək üçün bu linkə keçin: ${url}`,
    html: `<p>Salam ${escapeHtml(user.fullname)},</p><p>Şifrənizi yeniləmək üçün düyməyə klikləyin.</p><p><a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">🔒 Şifrəni yenilə</a></p><p>Link 1 saat qüvvədədir və yalnız bir dəfə istifadə edilə bilər.</p>`,
  });
  return url;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

router.post('/register', authRoute(async (req, res) => {
  const fullname = clean(req.body.fullname ?? req.body.name);
  const email = clean(req.body.email)?.toLowerCase();
  const phone = clean(req.body.phone);
  const password = clean(req.body.password);
  if (!fullname || !email || !password) return res.status(400).json({ success: false, error: 'fullname, email and password are required.', message: 'fullname, email and password are required.' });
  if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.', message: 'Password must be at least 6 characters.' });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(409).json({ success: false, error: 'Email is already registered.', message: 'Email is already registered.' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { fullname, email, phone, passwordHash, role: 'user', emailVerified: false, provider: 'local' } });
  await logUserActivity(prisma, user.id, 'register');
  let verificationEmailSent = true;
  try {
    await sendVerificationEmail(user);
  } catch (error) {
    verificationEmailSent = false;
    authErrorLog(error, { path: 'send_verification_email', user_id: user.id });
  }

  return res.status(201).json({
    success: true,
    user: publicUser(user),
    emailVerificationRequired: true,
    verificationEmailSent,
    message: 'Qeydiyyat tamamlandı. Email ünvanınızı təsdiqləməlisiniz.',
  });
}));

router.post('/login', authRoute(async (req, res) => {
  const email = clean(req.body.email)?.toLowerCase();
  const password = String(req.body.password || '');
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  if (!user || !user.passwordHash) return res.status(401).json({ success: false, error: 'Invalid email or password.', message: 'Invalid email or password.' });
  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return res.status(401).json({ success: false, error: 'Invalid email or password.', message: 'Invalid email or password.' });
  if (user.isActive === false) return res.status(403).json({ success: false, error: 'User account is blocked.', message: 'User account is blocked.' });
  if (user.emailVerified === false) {
    return res.status(403).json({
      success: false,
      code: 'EMAIL_NOT_VERIFIED',
      error: 'Email ünvanınızı təsdiqləməlisiniz.',
      message: 'Email ünvanınızı təsdiqləməlisiniz.',
      resendAvailable: true,
    });
  }

  const updatedUser = await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  await logUserActivity(prisma, user.id, 'login');
  return issueAuthResponse(req, res, updatedUser);
}));

router.post('/logout', authenticate, authRoute(async (req, res) => {
  if (req.authToken) await prisma.userSession.deleteMany({ where: { token: req.authToken } });
  await logUserActivity(prisma, req.auth.id, 'logout');
  res.json({ success: true, ok: true });
}));

router.post('/verify-email', authRoute(async (req, res) => {
  const rawToken = clean(req.body.token ?? req.query.token);
  if (!rawToken) return res.status(400).json({ success: false, code: 'TOKEN_REQUIRED', message: 'Təsdiqləmə tokeni tələb olunur.' });
  const stored = await prisma.emailVerificationToken.findUnique({ where: { token: tokenHash(rawToken) }, include: { user: true } });
  if (!stored) return res.status(400).json({ success: false, code: 'VERIFICATION_FAILED', message: 'Email təsdiqləmə linki yanlışdır.' });
  if (stored.used) return res.status(400).json({ success: false, code: 'VERIFICATION_USED', message: 'Bu təsdiqləmə linki artıq istifadə edilib.' });
  if (stored.expiresAt <= new Date()) return res.status(400).json({ success: false, code: 'VERIFICATION_EXPIRED', message: 'Təsdiqləmə linkinin vaxtı bitib.' });

  const user = await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({ where: { id: stored.id }, data: { used: true } });
    return tx.user.update({ where: { id: stored.userId }, data: { emailVerified: true } });
  });
  await logUserActivity(prisma, user.id, 'verify_email');
  res.json({ success: true, message: 'Hesab uğurla təsdiqləndi ✅', user: publicUser(user) });
}));

router.get('/verify-email', authRoute(async (req, res) => {
  const rawToken = clean(req.query.token);
  if (!rawToken) return res.status(400).json({ success: false, code: 'TOKEN_REQUIRED', message: 'Təsdiqləmə tokeni tələb olunur.' });
  const stored = await prisma.emailVerificationToken.findUnique({ where: { token: tokenHash(rawToken) }, include: { user: true } });
  if (!stored) return res.status(400).json({ success: false, code: 'VERIFICATION_FAILED', message: 'Email təsdiqləmə linki yanlışdır.' });
  if (stored.used) return res.status(400).json({ success: false, code: 'VERIFICATION_USED', message: 'Bu təsdiqləmə linki artıq istifadə edilib.' });
  if (stored.expiresAt <= new Date()) return res.status(400).json({ success: false, code: 'VERIFICATION_EXPIRED', message: 'Təsdiqləmə linkinin vaxtı bitib.' });
  const user = await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({ where: { id: stored.id }, data: { used: true } });
    return tx.user.update({ where: { id: stored.userId }, data: { emailVerified: true } });
  });
  await logUserActivity(prisma, user.id, 'verify_email');
  res.json({ success: true, message: 'Hesab uğurla təsdiqləndi ✅', user: publicUser(user) });
}));

router.post('/resend-verification', authRoute(async (req, res) => {
  const email = clean(req.body.email)?.toLowerCase();
  if (!email) return res.status(400).json({ success: false, message: 'Email tələb olunur.' });
  const rate = hitFixedWindow(resendVerificationAttempts, rateLimitKey('verify', email), RESEND_VERIFICATION_WINDOW_MS, 1);
  if (!rate.allowed) return res.status(429).json({ success: false, message: 'Zəhmət olmasa 1 dəqiqə sonra yenidən cəhd edin.' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerified && user.provider !== 'google') await sendVerificationEmail(user);
  res.json({ success: true, message: 'Əgər hesab təsdiqlənməyibsə, yeni təsdiqləmə linki göndərildi.' });
}));

router.post('/forgot-password', authRoute(async (req, res) => {
  const email = clean(req.body.email)?.toLowerCase();
  if (email) {
    const rate = hitFixedWindow(forgotPasswordAttempts, rateLimitKey('forgot', email), FORGOT_PASSWORD_WINDOW_MS, FORGOT_PASSWORD_LIMIT);
    if (!rate.allowed) return res.status(429).json({ success: false, message: 'Şifrə bərpası üçün maksimum 5 sorğu göndərə bilərsiniz. 1 saat sonra yenidən cəhd edin.' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.provider !== 'google') {
      await sendPasswordResetEmail(user);
      await logUserActivity(prisma, user.id, 'forgot_password');
    }
  }
  res.json({ success: true, ok: true, message: 'Əgər e-poçt mövcuddursa, bərpa təlimatı göndəriləcək.' });
}));

router.post('/reset-password', authRoute(async (req, res) => {
  const rawToken = clean(req.body.token ?? req.query.token);
  const password = clean(req.body.password ?? req.body.newPassword ?? req.body.new_password);
  const passwordConfirmation = clean(req.body.passwordConfirmation ?? req.body.password_confirmation ?? req.body.confirmPassword);
  if (!rawToken) return res.status(400).json({ success: false, code: 'TOKEN_REQUIRED', message: 'Şifrə bərpa tokeni tələb olunur.' });
  if (!password || password.length < 6) return res.status(400).json({ success: false, code: 'PASSWORD_TOO_SHORT', message: 'Yeni şifrə ən azı 6 simvol olmalıdır.' });
  if (passwordConfirmation !== undefined && password !== passwordConfirmation) return res.status(400).json({ success: false, code: 'PASSWORD_MISMATCH', message: 'Şifrələr uyğun deyil.' });

  const stored = await prisma.passwordResetToken.findUnique({ where: { token: tokenHash(rawToken) }, include: { user: true } });
  if (!stored) return res.status(400).json({ success: false, code: 'RESET_FAILED', message: 'Şifrə bərpa linki yanlışdır.' });
  if (stored.used) return res.status(400).json({ success: false, code: 'RESET_USED', message: 'Bu şifrə bərpa linki artıq istifadə edilib.' });
  if (stored.expiresAt <= new Date()) return res.status(400).json({ success: false, code: 'RESET_EXPIRED', message: 'Şifrə bərpa linkinin vaxtı bitib.' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.update({ where: { id: stored.id }, data: { used: true } });
    await tx.userSession.deleteMany({ where: { userId: stored.userId } });
    return tx.user.update({ where: { id: stored.userId }, data: { passwordHash, provider: stored.user.provider || 'local' } });
  });
  await logUserActivity(prisma, user.id, 'reset_password');
  res.json({ success: true, message: 'Şifrəniz uğurla dəyişdirildi ✅' });
}));

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || appUrl('/api/auth/google/callback');
  if (!clientId || !clientSecret) {
    const error = new Error('Google login is not configured.');
    error.status = 500;
    throw error;
  }
  return { clientId, clientSecret, redirectUri };
}

router.get('/google', authRoute(async (req, res) => {
  const { clientId, redirectUri } = googleConfig();
  const redirect = safeRedirect(clean(req.query.redirect) || appUrl('/'));
  const statePayload = signGoogleState({ redirect, nonce: crypto.randomBytes(12).toString('hex') });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', statePayload);
  url.searchParams.set('prompt', 'select_account');
  res.redirect(url.toString());
}));

router.get('/google/callback', authRoute(async (req, res) => {
  const code = clean(req.query.code);
  if (!code) return res.redirect(appUrl('/admin-login', { auth: 'google_failed' }));
  const { clientId, clientSecret, redirectUri } = googleConfig();
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  if (!tokenResponse.ok) return res.redirect(appUrl('/admin-login', { auth: 'google_failed' }));
  const tokenBody = await tokenResponse.json();
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tokenBody.access_token}` } });
  if (!profileResponse.ok) return res.redirect(appUrl('/admin-login', { auth: 'google_failed' }));
  const profile = await profileResponse.json();
  if (!profile.email) return res.redirect(appUrl('/admin-login', { auth: 'google_failed' }));

  const email = String(profile.email).toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    user = await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, lastLogin: new Date(), avatarUrl: user.avatarUrl || profile.picture || null, provider: user.provider || 'google' } });
    await logUserActivity(prisma, user.id, 'google_login');
  } else {
    user = await prisma.user.create({
      data: {
        fullname: profile.name || email,
        email,
        avatarUrl: profile.picture || null,
        emailVerified: true,
        provider: 'google',
        role: 'user',
        lastLogin: new Date(),
      },
    });
    await logUserActivity(prisma, user.id, 'google_register');
  }

  const jwtToken = signToken(tokenPayload(user));
  await createSession(req, user, jwtToken);
  let redirect = appUrl('/', { auth: 'google_success' });
  try {
    const state = verifyGoogleState(req.query.state);
    redirect = safeRedirect(state.redirect || redirect);
    const redirectUrl = new URL(redirect);
    redirectUrl.searchParams.set('auth', 'google_success');
    redirectUrl.searchParams.set('token', jwtToken);
    redirect = redirectUrl.toString();
  } catch (_error) {
    redirect = appUrl('/', { auth: 'google_success', token: jwtToken });
  }
  res.redirect(redirect);
}));

router.get('/google/session', authenticate, authRoute(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: Number(req.auth.id) } });
  if (!user) return res.status(404).json({ success: false, error: 'User not found.', message: 'User not found.' });
  res.json({ success: true, user: publicUser(user) });
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
  if (user.provider === 'local' && currentPassword && user.passwordHash && !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ success: false, error: 'Current password is incorrect.', message: 'Current password is incorrect.' });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12), provider: user.provider || 'local' } });
  await logUserActivity(prisma, user.id, 'change_password');
  res.json({ success: true, ok: true });
}));

module.exports = router;
