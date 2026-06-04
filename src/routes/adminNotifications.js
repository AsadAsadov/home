const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { createNotification } = require('../utils/inAppNotifications');

const router = express.Router();

const ALLOWED_INTERNAL_LINKS = new Set(['/gallery', '/projects', '/listings']);
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeLink(value) {
  const link = normalizeOptionalText(value);
  if (!link) return null;
  if (link.startsWith('/') && !link.startsWith('//') && !/^(https?:|mailto:|tel:|javascript:)/i.test(link)) {
    const pathOnly = link.split(/[?#]/)[0].replace(/\/$/, '') || '/';
    return ALLOWED_INTERNAL_LINKS.has(pathOnly) ? link : false;
  }
  try {
    const url = new URL(link);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : false;
  } catch (_error) {
    return false;
  }
}

function normalizeHttpUrl(value) {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : false;
  } catch (_error) {
    return false;
  }
}

function normalizeVideoUrl(value) {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  let url;
  try {
    url = new URL(text);
  } catch (_error) {
    return false;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  const host = url.hostname.toLowerCase();
  const isYoutube = YOUTUBE_HOSTS.has(host) || host.endsWith('.youtube.com');
  const isVimeo = VIMEO_HOSTS.has(host) || host.endsWith('.vimeo.com');
  const isMp4 = url.pathname.toLowerCase().endsWith('.mp4');
  return (isYoutube || isVimeo || isMp4) ? url.toString() : false;
}

router.post('/broadcast', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const message = String(req.body?.message || '').trim();
  const link = normalizeLink(req.body?.link);
  const imageUrl = normalizeHttpUrl(req.body?.imageUrl);
  const videoUrl = normalizeVideoUrl(req.body?.videoUrl);
  if (!title) return res.status(400).json({ message: 'Title tələb olunur.' });
  if (!message) return res.status(400).json({ message: 'Message tələb olunur.' });
  if (title.length > 120) return res.status(400).json({ message: 'Title maksimum 120 simvol olmalıdır.' });
  if (message.length > 1000) return res.status(400).json({ message: 'Message maksimum 1000 simvol olmalıdır.' });
  if (link === false) return res.status(400).json({ message: 'Link /gallery, /projects, /listings və ya http(s) URL olmalıdır.' });
  if (imageUrl === false) return res.status(400).json({ message: 'Şəkil URL http(s) formatında olmalıdır.' });
  if (videoUrl === false) return res.status(400).json({ message: 'Video URL YouTube, Vimeo və ya birbaşa MP4 linki olmalıdır.' });

  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  let createdCount = 0;
  let failedCount = 0;

  await Promise.all(users.map(async (user) => {
    try {
      await createNotification({ userId: user.id, title, message, link, imageUrl, videoUrl, type: 'system' });
      createdCount += 1;
    } catch (error) {
      failedCount += 1;
      console.error('[admin-notifications] broadcast item failed', { userId: user.id, message: error.message, code: error.code });
    }
  }));

  res.status(201).json({ totalUsers: users.length, createdCount, failedCount });
}));

module.exports = router;
