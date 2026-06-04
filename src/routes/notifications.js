const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const MESSAGE_NOTIFICATION_TYPES = ['new_message', 'message'];

function nonMessageNotificationWhere(req) {
  return { userId: Number(req.auth.id), type: { notIn: MESSAGE_NOTIFICATION_TYPES } };
}

function durationMs(startedAt) {
  return Number(process.hrtime.bigint() - startedAt) / 1e6;
}

async function visibleUnreadMessageCount(userId) {
  const participants = await prisma.participant.findMany({
    where: { userId: Number(userId) },
    include: { conversation: { select: { id: true, updatedAt: true } } },
  });
  const visible = participants.filter((participant) => !participant.hiddenAt || new Date(participant.conversation.updatedAt).getTime() > new Date(participant.hiddenAt).getTime());
  if (!visible.length) return 0;
  const counts = await Promise.all(visible.map((participant) => prisma.message.count({
    where: {
      conversationId: participant.conversationId,
      receiverId: Number(userId),
      isRead: false,
      ...(participant.clearedAt ? { createdAt: { gt: participant.clearedAt } } : {}),
    },
  })));
  return counts.reduce((sum, count) => sum + count, 0);
}

router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  const [notificationsUnread, messagesUnread] = await Promise.all([
    prisma.notification.count({ where: { ...nonMessageNotificationWhere(req), isRead: false } }),
    visibleUnreadMessageCount(req.auth.id),
  ]);
  res.json({ notificationsUnread, messagesUnread });
}));

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const startedAt = process.hrtime.bigint();
  try {
    const maxLimit = req.query.all === 'true' ? 1000 : 100;
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '30', 10) || 30, 1), maxLimit);
    const data = await prisma.notification.findMany({
      where: nonMessageNotificationWhere(req),
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    console.log('[notifications] list durationMs', { userId: req.auth.id, count: data.length, durationMs: Math.round(durationMs(startedAt)) });
    res.json({ data });
  } catch (error) {
    console.error('[notifications] list failed', { userId: req.auth.id, durationMs: Math.round(durationMs(startedAt)), message: error.message, code: error.code });
    throw error;
  }
}));

router.patch('/read-all', authenticate, asyncHandler(async (req, res) => {
  const startedAt = process.hrtime.bigint();
  try {
    const result = await prisma.notification.updateMany({ where: { ...nonMessageNotificationWhere(req), isRead: false }, data: { isRead: true } });
    console.log('[notifications] mark all read durationMs', { userId: req.auth.id, count: result.count, durationMs: Math.round(durationMs(startedAt)) });
    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('[notifications] mark all read failed', { userId: req.auth.id, durationMs: Math.round(durationMs(startedAt)), message: error.message, code: error.code });
    throw error;
  }
}));

router.patch('/:id/read', authenticate, asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid notification ID.' });
  const notification = await prisma.notification.findFirst({ where: { id, ...nonMessageNotificationWhere(req) } });
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
  res.json(updated);
}));

module.exports = router;
