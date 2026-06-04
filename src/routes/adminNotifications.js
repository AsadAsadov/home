const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { createNotification } = require('../utils/inAppNotifications');

const router = express.Router();

router.post('/broadcast', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const message = String(req.body?.message || '').trim();
  const link = req.body?.link ? String(req.body.link).trim() : null;
  if (!title) return res.status(400).json({ message: 'Title tələb olunur.' });
  if (!message) return res.status(400).json({ message: 'Message tələb olunur.' });

  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  let createdCount = 0;
  let failedCount = 0;

  await Promise.all(users.map(async (user) => {
    try {
      await createNotification({ userId: user.id, title, message, link, type: 'system' });
      createdCount += 1;
    } catch (error) {
      failedCount += 1;
      console.error('[admin-notifications] broadcast item failed', { userId: user.id, message: error.message, code: error.code });
    }
  }));

  res.status(201).json({ totalUsers: users.length, createdCount, failedCount });
}));

module.exports = router;
