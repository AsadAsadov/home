const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const SESSION_TIMEOUT_MS = 6 * 60 * 60 * 1000;

function jwtSecret() {
  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is missing');
    error.status = 500;
    throw error;
  }
  return process.env.JWT_SECRET;
}


function isAdminRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'super_admin';
}

function normalizeAuthRole(role) {
  if (isAdminRole(role)) return 'admin';
  return String(role || '').trim().toLowerCase() === 'user' ? 'user' : role;
}

function signToken(payload) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

function verifyToken(token) {
  const auth = jwt.verify(token, jwtSecret());
  auth.role = normalizeAuthRole(auth.role);
  return auth;
}

function tokenExpiresAt(token) {
  const decoded = jwt.decode(token);
  if (decoded?.exp) return new Date(decoded.exp * 1000);
  const fallbackDays = Number(process.env.JWT_FALLBACK_DAYS || 7);
  return new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000);
}

async function isSessionValid(token, auth) {
  try {
    const session = await prisma.userSession.findUnique({ where: { token } });
    if (!session || session.expiresAt <= new Date()) return false;
    if (session.lastActiveAt && Date.now() - new Date(session.lastActiveAt).getTime() > SESSION_TIMEOUT_MS) return false;
    if (String(session.userId) !== String(auth.id)) return false;
    await prisma.userSession.update({ where: { id: session.id }, data: { lastActiveAt: new Date() } });
    return true;
  } catch (error) {
    if (['P2021', 'P2022'].includes(error.code)) return true;
    throw error;
  }
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication token is required.' });

  try {
    req.auth = verifyToken(token);
    req.authToken = token;
    const valid = await isSessionValid(token, req.auth);
    if (!valid) return res.status(401).json({ message: 'Invalid or expired session.' });
    return next();
  } catch (error) {
    const message = error.message || 'Invalid or expired token.';
    const status = error.status || 401;
    return res.status(status).json({ success: false, error: message, message });
  }
}

async function optionalAuthenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.auth = verifyToken(token);
    req.authToken = token;
    const valid = await isSessionValid(token, req.auth);
    if (!valid) req.auth = null;
  } catch (_error) {
    req.auth = null;
  }
  return next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ message: 'Authentication is required.' });
    if (!roles.includes(req.auth.role)) return res.status(403).json({ message: 'You do not have permission for this action.' });
    return next();
  };
}

module.exports = { authenticate, optionalAuthenticate, authorize, signToken, tokenExpiresAt, verifyToken, isSessionValid };
