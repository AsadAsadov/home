require('dotenv').config();

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const prisma = require('./lib/prisma');
const { makeUniqueSlug } = require('./utils/seo');
const {
  buildListingSeo,
  buildProjectSeo,
  buildStaticSeo,
  buildGallerySeo,
  buildVacancySeo,
  injectSeoIntoHtml,
  siteUrl,
} = require('./utils/seoMeta');
const { generateNextListingCodeInLockedTransaction } = require('./utils/listingCode');
const { authenticate, authorize } = require('./middleware/auth');
const { sendEmail, verifySmtpTransporter } = require('./utils/email');
const { initRealtime } = require('./utils/realtime');

const app = express();
app.set('trust proxy', 1);
app.set('json replacer', (_key, value) => {
  if (typeof value !== 'bigint') return value;
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
});
const port = process.env.PORT || 3000;
const enableSecurityHeaders = process.env.ENABLE_SECURITY_HEADERS === 'true';

const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://besthome.az').replace(/\/+$/, '');


const indexHtmlPath = path.join(process.cwd(), 'index.html');

function routePathname(req) {
  return String(req.path || '/').split('?')[0] || '/';
}

function numericBigInt(value) {
  const raw = String(value || '').trim();
  if (!/^\d+$/.test(raw)) return null;
  try { return BigInt(raw); } catch (_error) { return null; }
}

async function resolveSeoForPath(pathname) {
  const baseUrl = siteUrl();
  const decodedPathname = decodeURIComponent(pathname || '/');
  const listingMatch = decodedPathname.match(/^\/listing\/([^/]+)\/?$/);
  if (listingMatch) {
    const code = numericBigInt(listingMatch[1]);
    if (code) {
      const listing = await prisma.listing.findFirst({
        where: { status: 'approved', OR: [{ listingCode: code }, { id: code }] },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      }).catch((error) => {
        console.warn('Listing SEO lookup failed:', error.message);
        return null;
      });
      if (listing) return buildListingSeo(listing, baseUrl);
    }
    return buildStaticSeo('/elanlar', baseUrl);
  }

  const projectMatch = decodedPathname.match(/^\/project\/([^/]+)\/?$/);
  if (projectMatch) {
    const slugOrId = String(projectMatch[1] || '').trim();
    const id = Number.parseInt(slugOrId, 10);
    const project = await prisma.project.findFirst({
      where: {
        isArchived: false,
        OR: [
          { slug: slugOrId },
          ...(Number.isInteger(id) && id > 0 ? [{ id }] : []),
        ],
      },
    }).catch((error) => {
      console.warn('Project SEO lookup failed:', error.message);
      return null;
    });
    if (project) return buildProjectSeo(project, baseUrl);
    return buildStaticSeo('/projects', baseUrl);
  }

  const galleryMatch = decodedPathname.match(/^\/(gallery|video)\/(\d+)\/?$/);
  if (galleryMatch) {
    const id = Number.parseInt(galleryMatch[2], 10);
    const item = await prisma.gallery.findUnique({ where: { id } }).catch(() => null);
    if (item) return buildGallerySeo(item, decodedPathname, baseUrl);
    return buildStaticSeo('/gallery', baseUrl);
  }

  const vacancyMatch = decodedPathname.match(/^\/vacancy\/([^/]+)\/?$/);
  if (vacancyMatch) {
    const slugOrId = String(vacancyMatch[1] || '').trim();
    const id = Number.parseInt(slugOrId, 10);
    const vacancy = await prisma.vacancy.findFirst({
      where: {
        isActive: true,
        OR: [
          { slug: slugOrId },
          ...(Number.isInteger(id) && id > 0 ? [{ id }] : []),
        ],
      },
    }).catch((error) => {
      console.warn('Vacancy SEO lookup failed:', error.message);
      return null;
    });
    if (vacancy) return buildVacancySeo(vacancy, decodedPathname, baseUrl);
  }

  return buildStaticSeo(decodedPathname, baseUrl);
}

async function sendSpaIndexWithSeo(req, res, next) {
  try {
    const pathname = routePathname(req);
    const [html, seo] = await Promise.all([
      fs.promises.readFile(indexHtmlPath, 'utf8'),
      resolveSeoForPath(pathname),
    ]);
    res.setHeader('Cache-Control', 'no-cache, max-age=0');
    res.type('html');
    return res.send(injectSeoIntoHtml(html, seo));
  } catch (error) {
    return next(error);
  }
}

function escapeSitemapXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sitemapDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function sitemapUrl(pathname, { lastmod = new Date(), changefreq = 'weekly', priority = '0.7' } = {}) {
  const normalizedPath = String(pathname || '/').startsWith('/') ? String(pathname || '/') : `/${pathname}`;
  return [
    '  <url>',
    `    <loc>${escapeSitemapXml(`${PUBLIC_SITE_URL}${normalizedPath}`)}</loc>`,
    `    <lastmod>${sitemapDate(lastmod)}</lastmod>`,
    `    <changefreq>${escapeSitemapXml(changefreq)}</changefreq>`,
    `    <priority>${escapeSitemapXml(priority)}</priority>`,
    '  </url>',
  ].join('\n');
}

async function buildSitemapXml() {
  const now = new Date();
  const urls = [
    sitemapUrl('/', { lastmod: now, changefreq: 'daily', priority: '1.0' }),
    sitemapUrl('/projects', { lastmod: now, changefreq: 'daily', priority: '0.9' }),
    sitemapUrl('/elanlar', { lastmod: now, changefreq: 'daily', priority: '0.9' }),
    sitemapUrl('/vacancies', { lastmod: now, changefreq: 'weekly', priority: '0.6' }),
    sitemapUrl('/gallery', { lastmod: now, changefreq: 'weekly', priority: '0.6' }),
    sitemapUrl('/videos', { lastmod: now, changefreq: 'weekly', priority: '0.5' }),
    sitemapUrl('/ipoteka-kalkulyatoru', { lastmod: now, changefreq: 'monthly', priority: '0.5' }),
  ];

  const [projectsResult, listingsResult, vacanciesResult, galleryResult] = await Promise.allSettled([
    prisma.project.findMany({
      where: { isArchived: false },
      select: { id: true, slug: true, createdAt: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      take: 10000,
    }),
    prisma.listing.findMany({
      where: { status: 'approved' },
      select: { id: true, listingCode: true, approvedAt: true, createdAt: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      take: 29980,
    }),
    prisma.vacancy.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, createdAt: true },
      orderBy: { id: 'asc' },
      take: 5000,
    }),
    prisma.gallery.findMany({
      select: { id: true, mediaType: true, createdAt: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      take: 5000,
    }),
  ]);

  if (projectsResult.status === 'fulfilled') {
    for (const project of projectsResult.value) {
      urls.push(sitemapUrl(`/project/${project.slug || project.id}`, { lastmod: project.createdAt, changefreq: 'weekly', priority: '0.8' }));
    }
  } else {
    console.warn('Sitemap projects skipped:', projectsResult.reason?.message || projectsResult.reason);
  }

  if (listingsResult.status === 'fulfilled') {
    for (const listing of listingsResult.value) {
      urls.push(sitemapUrl(`/listing/${listing.listingCode || listing.id}`, { lastmod: listing.approvedAt || listing.createdAt, changefreq: 'weekly', priority: '0.8' }));
    }
  } else {
    console.warn('Sitemap listings skipped:', listingsResult.reason?.message || listingsResult.reason);
  }

  if (vacanciesResult.status === 'fulfilled') {
    for (const vacancy of vacanciesResult.value) {
      urls.push(sitemapUrl(`/vacancy/${vacancy.slug || vacancy.id}`, { lastmod: vacancy.createdAt, changefreq: 'weekly', priority: '0.6' }));
    }
  } else {
    console.warn('Sitemap vacancies skipped:', vacanciesResult.reason?.message || vacanciesResult.reason);
  }

  if (galleryResult.status === 'fulfilled') {
    for (const item of galleryResult.value) {
      const pathPrefix = item.mediaType === 'video' ? '/video' : '/gallery';
      urls.push(sitemapUrl(`${pathPrefix}/${item.id}`, { lastmod: item.createdAt, changefreq: 'monthly', priority: item.mediaType === 'video' ? '0.5' : '0.6' }));
    }
  } else {
    console.warn('Sitemap gallery skipped:', galleryResult.reason?.message || galleryResult.reason);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function warnMissingRequiredEnv() {
  for (const name of ['JWT_SECRET', 'DATABASE_URL']) {
    if (!process.env[name]) console.warn(`WARNING: ${name} is missing`);
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn('WARNING: GOOGLE_CLIENT_ID is missing; Google login and registration buttons will redirect to a server-side configuration error.');
  }
}

warnMissingRequiredEnv();
console.log('SMTP CONFIG', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  from: process.env.SMTP_FROM,
  hasPass: Boolean(process.env.SMTP_PASS),
});
if (process.env.SMTP_HOST || process.env.SMTP_USER || process.env.SMTP_PASS) {
  verifySmtpTransporter().catch(() => {});
}
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
const uploadsStaticDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const origins = (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true, credentials: true }));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  hsts: false,
}));
app.use((req, res, next) => {
  if (enableSecurityHeaders && req.secure) {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Origin-Agent-Cluster', '?1');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return next();
});
app.use((req, res, next) => {
  if (process.env.FORCE_HTTPS === 'true' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  return next();
});
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({
  limit: '50mb',
  extended: true,
}));

const uploadCacheStaticOptions = {
  maxAge: '30d',
  setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=2592000'),
};
const immutableAssetStaticOptions = {
  maxAge: '1y',
  setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'),
};

app.use('/uploads', express.static(uploadDir, uploadCacheStaticOptions));
if (uploadsStaticDir !== uploadDir) app.use('/uploads', express.static(uploadsStaticDir, uploadCacheStaticOptions));
app.use('/public/assets', express.static(path.join(process.cwd(), 'public/assets'), immutableAssetStaticOptions));

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send('User-agent: *\nAllow: /\n\nSitemap: https://besthome.az/sitemap.xml\n');
});

app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    res.type('application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(await buildSitemapXml());
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'besthome-backend' }));
app.get('/api/config/maps', (_req, res) => {
  res.json({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || '',
  });
});
app.post('/api/debug/send-test-email', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const to = String(req.body?.to || '').trim();
    if (!to) return res.status(400).json({ success: false, message: 'Email ünvanı tələb olunur.' });
    const info = await sendEmail({
      to,
      subject: 'Best Home test email',
      text: 'SMTP işləyir.',
      html: '<p>SMTP işləyir.</p>',
    });
    return res.json({
      success: true,
      message: 'Test email göndərildi.',
      messageId: info?.messageId,
      accepted: info?.accepted,
      rejected: info?.rejected,
      response: info?.response,
    });
  } catch (error) {
    return next(error);
  }
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin/email', require('./routes/adminEmail'));
app.use('/api/admin/notifications', require('./routes/adminNotifications'));
app.use('/api/admin/stats', require('./routes/adminStats'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/vacancies', require('./routes/vacancies'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/hero-sections', require('./routes/heroSections'));
app.use('/api/hero-slides', require('./routes/heroSlides'));
app.use('/api/listing-hero-items', require('./routes/listingHeroItems'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/site-ads', require('./routes/siteAds'));
app.use('/api/site-settings', require('./routes/siteSettings'));
app.use('/api/sync', require('./routes/sync'));

app.use('/api', (_req, res) => res.status(404).json({ message: 'API route not found.' }));

app.use(express.static(process.cwd(), { index: false, maxAge: '1h' }));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return sendSpaIndexWithSeo(req, res, next);
});

app.use((err, _req, res, _next) => {
  console.error('API ERROR', {
    message: err.message,
    name: err.name,
    code: err.code,
    meta: err.meta,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file is too large.' : err.message;
    return res.status(413).json({ success: false, error: message, message });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Request entity too large.', message: 'Request entity too large.' });
  }
  const isPrismaError = typeof err.code === 'string' && /^P\d{4}$/.test(err.code);
  const status = err.status || (err.code === 'P2025' ? 404 : 500);
  const message = isPrismaError ? 'Server database error.' : (err.message || 'Unexpected server error.');
  return res.status(status).json({
    success: false,
    error: message,
    message,
  });
});

async function ensurePublicUsersAuthColumns() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public."users"
        ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'local',
        ADD COLUMN IF NOT EXISTS "google_id" TEXT,
        ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "phone_verified" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "last_login" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "last_login_ip" TEXT,
        ADD COLUMN IF NOT EXISTS "last_login_user_agent" TEXT,
        ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
    await prisma.$executeRawUnsafe('ALTER TABLE public."users" ALTER COLUMN "password_hash" DROP NOT NULL');
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_key" ON public."users"("google_id")');
  } catch (error) {
    if (['P2021', 'P2022'].includes(error.code)) {
      console.warn('Public users auth-column bootstrap skipped until the public.users table exists:', error.message);
      return;
    }
    throw error;
  }
}


async function ensureStructuredProjectColumns() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public."projects"
        ADD COLUMN IF NOT EXISTS "zone" TEXT,
        ADD COLUMN IF NOT EXISTS "coastline" TEXT,
        ADD COLUMN IF NOT EXISTS "sea_distance" TEXT,
        ADD COLUMN IF NOT EXISTS "building_count" TEXT,
        ADD COLUMN IF NOT EXISTS "parking_spaces" TEXT,
        ADD COLUMN IF NOT EXISTS "apartment_formats" TEXT,
        ADD COLUMN IF NOT EXISTS "apartment_areas" TEXT,
        ADD COLUMN IF NOT EXISTS "area_range" TEXT,
        ADD COLUMN IF NOT EXISTS "price_per_m2" TEXT,
        ADD COLUMN IF NOT EXISTS "total_price" TEXT,
        ADD COLUMN IF NOT EXISTS "bank_mortgage" TEXT,
        ADD COLUMN IF NOT EXISTS "internal_credit" TEXT,
        ADD COLUMN IF NOT EXISTS "down_payment" TEXT,
        ADD COLUMN IF NOT EXISTS "infrastructure" TEXT
    `);
    await prisma.$executeRawUnsafe('UPDATE public."projects" SET "area_range" = "area" WHERE "area_range" IS NULL AND "area" IS NOT NULL');
  } catch (error) {
    if (['P2021', 'P2022'].includes(error.code)) {
      console.warn('Structured project-column bootstrap skipped until the public.projects table exists:', error.message);
      return;
    }
    throw error;
  }
}


async function ensureProjectArchiveColumn() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE public."projects" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN NOT NULL DEFAULT false');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_projects_is_archived" ON public."projects"("is_archived")');
  } catch (error) {
    if (['P2021', 'P2022'].includes(error.code)) {
      console.warn('Project archive bootstrap skipped until the public.projects table exists:', error.message);
      return;
    }
    throw error;
  }
}



async function ensureProjectAnalyticsAndInquiryTables() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public."projects"
        ADD COLUMN IF NOT EXISTS "pdf_url" TEXT,
        ADD COLUMN IF NOT EXISTS "pdf_filename" TEXT,
        ADD COLUMN IF NOT EXISTS "brochure_url" TEXT,
        ADD COLUMN IF NOT EXISTS "brochure_filename" TEXT,
        ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "click_count" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "inquiry_count" INTEGER NOT NULL DEFAULT 0
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public."project_inquiries" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL REFERENCES public."projects"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "note" TEXT,
        "status" TEXT NOT NULL DEFAULT 'new',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_project_inquiries_project_id" ON public."project_inquiries"("project_id")');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_project_inquiries_status_created" ON public."project_inquiries"("status", "created_at")');
  } catch (error) {
    if (['P2021', 'P2022'].includes(error.code)) {
      console.warn('Project analytics/inquiries bootstrap skipped until the public.projects table exists:', error.message);
      return;
    }
    throw error;
  }
}

async function ensureSeoIdentifiers() {
  try {
    const projects = await prisma.project.findMany({ where: { slug: null }, orderBy: { id: 'asc' } });
    for (const project of projects) {
      await prisma.$transaction(async (tx) => {
        const slug = await makeUniqueSlug({ model: 'project', title: project.title, currentId: project.id, tx, fallback: 'project' });
        await tx.project.update({ where: { id: project.id }, data: { slug } });
      });
    }

    const vacancies = await prisma.vacancy.findMany({ where: { slug: null }, orderBy: { id: 'asc' } });
    for (const vacancy of vacancies) {
      await prisma.$transaction(async (tx) => {
        const slug = await makeUniqueSlug({ model: 'vacancy', title: vacancy.title, currentId: vacancy.id, tx, fallback: 'vacancy' });
        await tx.vacancy.update({ where: { id: vacancy.id }, data: { slug } });
      });
    }

    const listings = await prisma.listing.findMany({ where: { listingCode: null }, orderBy: { id: 'asc' } });
    for (const [index, listing] of listings.entries()) {
      await prisma.$transaction(async (tx) => {
        const listingCode = await generateNextListingCodeInLockedTransaction(tx, index);
        await tx.listing.update({ where: { id: listing.id }, data: { listingCode } });
      });
    }
  } catch (error) {
    if (['P2022', 'P2021'].includes(error.code)) {
      console.warn('SEO identifier bootstrap skipped until database migrations are applied:', error.message);
      return;
    }
    throw error;
  }
}

async function ensureDefaultAdmin() {
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@besthome.az';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin12345';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { role: 'admin', isActive: true, emailVerified: true, provider: 'local' },
    create: { fullname: 'BestHome Admin', email, passwordHash, role: 'admin', isActive: true, emailVerified: true, provider: 'local' },
  });
}

const server = http.createServer(app);
initRealtime(server, { jwtSecret: process.env.JWT_SECRET });

Promise.all([ensurePublicUsersAuthColumns(), ensureProjectArchiveColumn(), ensureStructuredProjectColumns(), ensureProjectAnalyticsAndInquiryTables()])
  .then(() => Promise.all([ensureDefaultAdmin(), ensureSeoIdentifiers()]))
  .catch((error) => {
    console.error('Default admin bootstrap failed:', error);
  })
  .finally(() => {
    server.listen(port, () => {
      console.log(`BestHome backend listening on :${port}`);
    });
  });
