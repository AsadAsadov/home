const express = require('express');
const path = require('path');
const prisma = require('../lib/prisma');
const { createUpload, localUploadUrl } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const ALLOWED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a']);
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'application/ogg',
  'audio/mp4',
  'audio/x-m4a',
]);

const upload = createUpload('music', {
  files: 1,
  fileSize: Number(process.env.MAX_MUSIC_UPLOAD_FILE_SIZE || 50 * 1024 * 1024),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    cb(null, ALLOWED_AUDIO_EXTENSIONS.has(ext) || ALLOWED_AUDIO_MIME_TYPES.has(mime));
  },
});

function parseBool(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on', 'aktiv'].includes(String(value).toLowerCase());
}

function parseIntValue(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function audioUrlHasAllowedFormat(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return false;
  try {
    const parsed = raw.startsWith('/') ? new URL(raw, 'https://besthome.az') : new URL(raw);
    return ALLOWED_AUDIO_EXTENSIONS.has(path.extname(parsed.pathname || '').toLowerCase());
  } catch (_error) {
    return ALLOWED_AUDIO_EXTENSIONS.has(path.extname(raw.split(/[?#]/)[0] || '').toLowerCase());
  }
}

function serializeTrack(track = {}) {
  const audioUrl = track.audioUrl || track.audio_url || track.fileUrl || track.file_url || '';
  return {
    ...track,
    audioUrl,
    audio_url: audioUrl,
    fileUrl: audioUrl,
    file_url: audioUrl,
    isActive: Boolean(track.isActive ?? track.is_active),
    is_active: Boolean(track.isActive ?? track.is_active),
    sortOrder: Number(track.sortOrder ?? track.sort_order ?? 0),
    sort_order: Number(track.sortOrder ?? track.sort_order ?? 0),
  };
}

function payload(body = {}, uploadedUrl = null, existing = {}) {
  const audioUrl = uploadedUrl || body.audio_url || body.audioUrl || body.file_url || body.fileUrl || existing.audioUrl || existing.fileUrl || '';
  const data = {
    title: String(body.title ?? existing.title ?? '').trim(),
    audioUrl: String(audioUrl || '').trim(),
    isActive: parseBool(body.is_active ?? body.isActive, existing.isActive ?? true),
    sortOrder: parseIntValue(body.sort_order ?? body.sortOrder, existing.sortOrder ?? 0),
  };
  if (!data.title) {
    const error = new Error('Track title is required.');
    error.status = 400;
    throw error;
  }
  if (!data.audioUrl) {
    const error = new Error('Audio file or URL is required.');
    error.status = 400;
    throw error;
  }
  if (!uploadedUrl && !audioUrlHasAllowedFormat(data.audioUrl)) {
    const error = new Error('Allowed audio formats: mp3, wav, ogg, m4a.');
    error.status = 400;
    throw error;
  }
  return data;
}

function parseTrackOrder(body) {
  const raw = Array.isArray(body?.order) ? body.order : Array.isArray(body?.items) ? body.items : [];
  return raw.map((item, index) => ({
    id: Number.parseInt(typeof item === 'object' ? item.id : item, 10),
    sortOrder: parseIntValue(typeof item === 'object' ? (item.sortOrder ?? item.sort_order) : undefined, index + 1),
  })).filter((item) => Number.isInteger(item.id) && item.id > 0);
}

router.get('/site-music', asyncHandler(async (_req, res) => {
  const tracks = await prisma.siteMusicTrack.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  });
  res.json(tracks.map(serializeTrack));
}));

router.get('/admin/site-music', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const tracks = await prisma.siteMusicTrack.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] });
  res.json(tracks.map(serializeTrack));
}));

function logMusicMutationError(action, error, context = {}) {
  console.error(`Site music ${action} failed`, {
    ...context,
    message: error.message,
    name: error.name,
    code: error.code,
    meta: error.meta,
  });
}

router.post('/admin/site-music', authenticate, authorize('admin'), upload.single('audio'), asyncHandler(async (req, res) => {
  try {
    const data = payload(req.body, req.file ? localUploadUrl(req.file) : null);
    const created = await prisma.siteMusicTrack.create({ data });
    return res.status(201).json(serializeTrack(created));
  } catch (error) {
    logMusicMutationError('create', error, { title: req.body?.title, hasUpload: Boolean(req.file) });
    throw error;
  }
}));

router.put('/admin/site-music/:id', authenticate, authorize('admin'), upload.single('audio'), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  try {
    const existing = await prisma.siteMusicTrack.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Music track not found.' });
    const data = payload(req.body, req.file ? localUploadUrl(req.file) : null, existing);
    const updated = await prisma.siteMusicTrack.update({ where: { id }, data });
    return res.json(serializeTrack(updated));
  } catch (error) {
    logMusicMutationError('update', error, { id, title: req.body?.title, hasUpload: Boolean(req.file) });
    throw error;
  }
}));

router.delete('/admin/site-music/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.siteMusicTrack.delete({ where: { id: Number.parseInt(req.params.id, 10) } });
  res.status(204).send();
}));

router.post('/admin/site-music/reorder', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const items = parseTrackOrder(req.body);
  if (!items.length) return res.status(400).json({ message: 'Track order array is required.' });
  if (new Set(items.map((item) => item.id)).size !== items.length) return res.status(400).json({ message: 'Track IDs must be unique.' });
  await prisma.$transaction(items.map((item) => prisma.siteMusicTrack.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));
  const tracks = await prisma.siteMusicTrack.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] });
  res.json({ ok: true, items: tracks.map(serializeTrack) });
}));

module.exports = router;
