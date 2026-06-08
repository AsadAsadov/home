const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const STATIC_EXTENSION_RE = /\.(?:css|js|mjs|map|png|jpe?g|gif|webp|svg|ico|avif|bmp|tiff?|woff2?|ttf|eot|otf|mp4|webm|mov|mp3|wav|pdf|zip|rar|7z|xml|txt)$/i;
const STATIC_PREFIXES = ['/api', '/uploads', '/public', '/assets', '/node_modules'];
const STATIC_PATHS = new Set(['/favicon.ico', '/robots.txt', '/sitemap.xml']);

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || '';
}

function hashIp(ip) {
  const normalized = String(ip || '').trim();
  if (!normalized) return null;
  const salt = process.env.VISIT_ANALYTICS_SALT || process.env.JWT_SECRET || 'besthome-visit-analytics';
  return crypto.createHash('sha256').update(`${salt}:${normalized}`).digest('hex');
}

function getBearerOrCookieToken(req) {
  const header = String(req.headers.authorization || '');
  if (header.startsWith('Bearer ')) return header.slice(7);
  const cookie = String(req.headers.cookie || '');
  const match = cookie.match(/(?:^|;\s*)besthome_auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getUserIdFromRequest(req) {
  if (req.auth?.id) return Number(req.auth.id) || null;
  const token = getBearerOrCookieToken(req);
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return Number(decoded?.id) || null;
  } catch (_error) {
    return null;
  }
}

function parseUserAgent(userAgent = '') {
  const ua = String(userAgent || '');
  const lower = ua.toLowerCase();
  const deviceType = /bot|crawl|spider|slurp|bingpreview/.test(lower) ? 'bot'
    : /ipad|tablet|kindle|playbook|silk/.test(lower) ? 'tablet'
    : /mobile|iphone|ipod|android.*mobile|windows phone/.test(lower) ? 'mobile'
    : 'desktop';

  const browser = /edg\//i.test(ua) ? 'Edge'
    : /opr\//i.test(ua) || /opera/i.test(ua) ? 'Opera'
    : /chrome|crios/i.test(ua) && !/edg\//i.test(ua) ? 'Chrome'
    : /firefox|fxios/i.test(ua) ? 'Firefox'
    : /safari/i.test(ua) && !/chrome|crios/i.test(ua) ? 'Safari'
    : /msie|trident/i.test(ua) ? 'Internet Explorer'
    : 'Other';

  const os = /windows nt/i.test(ua) ? 'Windows'
    : /android/i.test(ua) ? 'Android'
    : /iphone|ipad|ipod/i.test(ua) ? 'iOS'
    : /mac os x|macintosh/i.test(ua) ? 'macOS'
    : /linux/i.test(ua) ? 'Linux'
    : 'Other';

  return { deviceType, browser, os };
}

function shouldTrackVisit(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const path = req.path || '/';
  if (STATIC_PATHS.has(path)) return false;
  if (STATIC_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`))) return false;
  if (STATIC_EXTENSION_RE.test(path)) return false;
  return true;
}

function buildVisitPayload(req) {
  const originalUrl = req.originalUrl || req.url || '/';
  const fullUrl = `${req.protocol}://${req.get('host') || ''}${originalUrl}`;
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 1000);
  const { deviceType, browser, os } = parseUserAgent(userAgent);
  return {
    path: (req.path || '/').slice(0, 1000),
    fullUrl: fullUrl.slice(0, 2000),
    referrer: String(req.headers.referer || req.headers.referrer || '').slice(0, 2000) || null,
    userAgent: userAgent || null,
    ipHash: hashIp(getClientIp(req)),
    deviceType,
    browser,
    os,
    userId: getUserIdFromRequest(req),
  };
}

async function recordVisit(payload) {
  await prisma.$executeRaw`
    INSERT INTO public."page_views" ("path", "full_url", "referrer", "user_agent", "ip_hash", "device_type", "browser", "os", "user_id")
    VALUES (${payload.path}, ${payload.fullUrl}, ${payload.referrer}, ${payload.userAgent}, ${payload.ipHash}, ${payload.deviceType}, ${payload.browser}, ${payload.os}, ${payload.userId})
  `;
}

function visitTrackingMiddleware(req, res, next) {
  if (!shouldTrackVisit(req)) return next();
  const payload = buildVisitPayload(req);
  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 400) return;
    setImmediate(() => {
      recordVisit(payload).catch(error => {
        if (process.env.NODE_ENV !== 'production') console.warn('Visit tracking skipped:', error.message);
      });
    });
  });
  return next();
}

async function ensurePageViewsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public."page_views" (
      "id" BIGSERIAL PRIMARY KEY,
      "path" TEXT NOT NULL,
      "full_url" TEXT,
      "referrer" TEXT,
      "user_agent" TEXT,
      "ip_hash" TEXT,
      "device_type" TEXT,
      "browser" TEXT,
      "os" TEXT,
      "user_id" INTEGER REFERENCES public."users"("id") ON DELETE SET NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_page_views_created_at" ON public."page_views"("created_at")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_page_views_path" ON public."page_views"("path")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_page_views_user_id" ON public."page_views"("user_id")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_page_views_ip_hash" ON public."page_views"("ip_hash")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_page_views_device_type" ON public."page_views"("device_type")');
}

module.exports = {
  buildVisitPayload,
  ensurePageViewsTable,
  parseUserAgent,
  shouldTrackVisit,
  visitTrackingMiddleware,
};
