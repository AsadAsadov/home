const prisma = require('../lib/prisma');
const { emitToUser } = require('./realtime');

const NOTIFICATION_TYPES = new Set([
  'listing_pending',
  'listing_approved',
  'listing_rejected',
  'new_message',
  'message',
  'vacancy_application',
  'system',
]);

function normalizeType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  if (['new-message', 'new message', 'message_new', 'message'].includes(normalized)) return 'message';
  return NOTIFICATION_TYPES.has(normalized) ? normalized : 'system';
}

async function createNotification({ userId, title, message, type = 'system', link = null }, tx = prisma) {
  if (!userId) return null;
  const notification = await tx.notification.create({
    data: {
      userId: Number(userId),
      title: String(title || '').trim() || 'Bildiriş',
      message: String(message || '').trim() || null,
      type: normalizeType(type),
      link: link ? String(link) : null,
    },
  });
  emitToUser(userId, 'notification:new', notification);
  return notification;
}

async function notifyAdmins(payload, tx = prisma) {
  const admins = await tx.user.findMany({ where: { role: 'admin', isActive: true }, select: { id: true } });
  return Promise.all(admins.map((admin) => createNotification({ ...payload, userId: admin.id }, tx)));
}

module.exports = { createNotification, notifyAdmins, NOTIFICATION_TYPES };
