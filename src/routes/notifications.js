const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function notificationWhere(req) {
  return { userId: Number(req.auth.id) };
}

router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  console.log('[notifications] summary start', { userId: req.auth.id });
  try {
  const [notificationsUnread, messagesUnread] = await Promise.all([
    prisma.notification.count({ where: { ...notificationWhere(req), isRead: false } }),
    prisma.message.count({ where: { receiverId: Number(req.auth.id), isRead: false } }),
  ]);
  console.log('[notifications] summary success', { userId: req.auth.id, notificationsUnread, messagesUnread });
  res.json({ notificationsUnread, messagesUnread });
  } catch (error) {
    console.error('[notifications] summary failed', { userId: req.auth.id, message: error.message, code: error.code });
    throw error;
  }
}));

router.get('/', authenticate, asyncHandler(async (req, res) => {
  console.log('[notifications] list start', { userId: req.auth.id });
  try {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '30', 10) || 30, 1), 100);
  const data = await prisma.notification.findMany({
    where: notificationWhere(req),
    orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
  });
  console.log('[notifications] list success', { userId: req.auth.id, count: data.length });
  res.json({ data });
  } catch (error) {
    console.error('[notifications] list failed', { userId: req.auth.id, message: error.message, code: error.code });
    throw error;
  }
}));

router.patch('/:id/read', authenticate, asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid notification ID.' });
  const notification = await prisma.notification.findFirst({ where: { id, ...notificationWhere(req) } });
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
  res.json(updated);
}));

router.patch('/read-all', authenticate, asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { ...notificationWhere(req), isRead: false }, data: { isRead: true } });
  res.json({ success: true, count: result.count });
}));

module.exports = router;
