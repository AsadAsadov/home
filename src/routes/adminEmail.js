const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { sendAnnouncementEmail, notificationErrorDetails } = require('../utils/notifications');

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function googleUserRecipients() {
  const users = await prisma.user.findMany({
    where: { OR: [{ provider: 'google' }, { googleId: { not: null } }] },
    select: { email: true },
  });
  return [...new Set(users.map((user) => normalizeEmail(user.email)).filter(isValidEmail))];
}

router.get('/google-users/summary', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const recipients = await googleUserRecipients();
  res.json({ totalRecipients: recipients.length });
}));

router.post('/google-users', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  console.log('[admin-email] google users send start');
  const subject = String(req.body?.subject || '').trim();
  const message = String(req.body?.message || '').trim();
  if (!subject) return res.status(400).json({ success: false, message: 'Subject tələb olunur.' });
  if (!message) return res.status(400).json({ success: false, message: 'Message tələb olunur.' });

  const recipients = await googleUserRecipients();
  console.log('[admin-email] recipients found', { totalRecipients: recipients.length });

  let sentCount = 0;
  const failedEmails = [];
  for (const email of recipients) {
    try {
      const info = await sendAnnouncementEmail(email, subject, message);
      sentCount += 1;
      console.log('[admin-email] sent', { email, messageId: info?.messageId });
    } catch (error) {
      failedEmails.push(email);
      console.error('[admin-email] failed', { email, error: notificationErrorDetails(error) });
    }
  }

  res.json({
    success: failedEmails.length === 0,
    totalRecipients: recipients.length,
    sentCount,
    failedCount: failedEmails.length,
    failedEmails,
  });
}));

module.exports = router;
