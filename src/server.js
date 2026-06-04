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
const { generateNextListingCodeInLockedTransaction } = require('./utils/listingCode');
const { authenticate, authorize } = require('./middleware/auth');
const { sendEmail, verifySmtpTransporter } = require('./utils/email');
const { initRealtime } = require('./utils/realtime');

const app = express();
app.set('json replacer', (_key, value) => {
  if (typeof value !== 'bigint') return value;
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
});
const port = process.env.PORT || 3000;

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
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({
  limit: '50mb',
  extended: true,
}));

app.use('/uploads', express.static(uploadDir));
if (uploadsStaticDir !== uploadDir) app.use('/uploads', express.static(uploadsStaticDir));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'besthome-backend' }));
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

app.use(express.static(process.cwd(), { index: false }));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(process.cwd(), 'index.html'));
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


async function logMessagingTableHealth() {
  const tables = ['notifications', 'conversations', 'participants', 'messages'];
  await Promise.all(tables.map(async (table) => {
    try {
      const result = await prisma.$queryRawUnsafe(
        'SELECT to_regclass($1) IS NOT NULL AS "exists"',
        `public."${table}"`,
      );
      if (result?.[0]?.exists) {
        console.log(`[db] ${table} OK`);
        return;
      }
      console.warn(`[db] missing table ${table}`);
    } catch (error) {
      console.warn(`[db] missing table ${table}`, error.message);
    }
  }));
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

logMessagingTableHealth()
  .then(() => ensurePublicUsersAuthColumns())
  .then(() => Promise.all([ensureDefaultAdmin(), ensureSeoIdentifiers()]))
  .catch((error) => {
    console.error('Default admin bootstrap failed:', error);
  })
  .finally(() => {
    server.listen(port, () => {
      console.log(`BestHome backend listening on :${port}`);
    });
  });
