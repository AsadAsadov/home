require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

const origins = (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true, credentials: true }));
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

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
  const status = err.status || (err.code === 'P2025' ? 404 : 500);
  res.status(status).json({ message: status === 500 ? 'Internal server error.' : err.message, details: process.env.NODE_ENV === 'production' ? undefined : err });
});

app.listen(port, () => {
  console.log(`BestHome backend listening on :${port}`);
});
