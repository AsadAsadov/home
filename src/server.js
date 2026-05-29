require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

const app = express();
const port = process.env.PORT || 3000;
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

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
app.use(express.static(process.cwd()));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'besthome-backend' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/vacancies', require('./routes/vacancies'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/sync', require('./routes/sync'));

app.get('*', (_req, res) => res.sendFile(path.join(process.cwd(), 'index.html')));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err instanceof multer.MulterError) {
    return res.status(413).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file is too large.' : err.message });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request entity too large.' });
  }
  const status = err.status || (err.code === 'P2025' ? 404 : 500);
  return res.status(status).json({ message: status === 500 ? 'Internal server error.' : err.message, details: process.env.NODE_ENV === 'production' ? undefined : err });
});

async function ensureDefaultAdmin() {
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@besthome.az';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin12345';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { role: 'admin' },
    create: { fullname: 'BestHome Admin', email, passwordHash, role: 'admin' },
  });
}

ensureDefaultAdmin()
  .catch((error) => {
    console.error('Default admin bootstrap failed:', error);
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`BestHome backend listening on :${port}`);
    });
  });
