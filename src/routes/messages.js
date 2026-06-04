const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { emitToUser, isUserOnline } = require('../utils/realtime');
const { createNotification } = require('../utils/inAppNotifications');

const router = express.Router();

function toIntId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toBigIntId(value) {
  if (value === undefined || value === null || value === '') return null;
  try {
    const id = BigInt(value);
    return id > 0n ? id : null;
  } catch (_error) {
    return null;
  }
}

function listingInclude() {
  return { images: { orderBy: { sortOrder: 'asc' }, take: 1 } };
}

const conversationInclude = {
  participants: { include: { user: { select: { id: true, fullname: true, avatarUrl: true } } } },
  listing: { include: listingInclude() },
  messages: { orderBy: { createdAt: 'desc' }, take: 1 },
};

async function requireParticipant(conversationId, userId) {
  return prisma.participant.findFirst({ where: { conversationId: BigInt(conversationId), userId: Number(userId) } });
}

function serializeConversation(conversation, currentUserId, unreadCount = 0) {
  const other = conversation.participants?.find((p) => String(p.userId) !== String(currentUserId)) || conversation.participants?.[0];
  return {
    ...conversation,
    otherUser: other?.user || null,
    unreadCount,
    lastMessage: conversation.messages?.[0] || null,
  };
}

async function conversationUnreadCounts(userId, ids) {
  if (!ids.length) return new Map();
  const grouped = await prisma.message.groupBy({
    by: ['conversationId'],
    where: { conversationId: { in: ids }, receiverId: Number(userId), isRead: false },
    _count: { _all: true },
  });
  return new Map(grouped.map((row) => [String(row.conversationId), row._count._all]));
}

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const deliveredNow = new Date();
  const undelivered = await prisma.message.findMany({
    where: { receiverId: Number(req.auth.id), deliveredAt: null },
    select: { id: true, senderId: true, conversationId: true },
  });
  if (undelivered.length) {
    await prisma.message.updateMany({ where: { id: { in: undelivered.map((m) => m.id) } }, data: { deliveredAt: deliveredNow } });
    undelivered.forEach((message) => emitToUser(message.senderId, 'message:delivered', { conversationId: message.conversationId, messageId: message.id, deliveredAt: deliveredNow }));
  }
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: Number(req.auth.id) } } },
    include: conversationInclude,
    orderBy: { updatedAt: 'desc' },
  });
  const counts = await conversationUnreadCounts(req.auth.id, conversations.map((item) => item.id));
  res.json({ data: conversations.map((conversation) => serializeConversation(conversation, req.auth.id, counts.get(String(conversation.id)) || 0)) });
}));

router.post('/conversations', authenticate, asyncHandler(async (req, res) => {
  const listingId = toBigIntId(req.body.listingId ?? req.body.listing_id);
  let receiverId = toIntId(req.body.receiverId ?? req.body.receiver_id);

  if (listingId && !receiverId) {
    const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { userId: true, status: true } });
    if (!listing || listing.status !== 'approved') return res.status(404).json({ message: 'Listing not found.' });
    receiverId = toIntId(listing.userId);
  }
  if (!receiverId) return res.status(400).json({ message: 'Recipient is required.' });
  if (String(receiverId) === String(req.auth.id)) return res.status(400).json({ message: 'Özünüzə mesaj göndərə bilməzsiniz.' });

  const existingParticipants = await prisma.participant.findMany({
    where: { userId: { in: [Number(req.auth.id), receiverId] }, ...(listingId ? { conversation: { listingId } } : {}) },
    select: { conversationId: true },
  });
  const counts = existingParticipants.reduce((acc, p) => acc.set(String(p.conversationId), (acc.get(String(p.conversationId)) || 0) + 1), new Map());
  const existingId = [...counts.entries()].find(([, count]) => count === 2)?.[0];

  const conversation = existingId
    ? await prisma.conversation.findUnique({ where: { id: BigInt(existingId) }, include: conversationInclude })
    : await prisma.conversation.create({
      data: {
        listingId,
        participants: { create: [{ userId: Number(req.auth.id) }, { userId: receiverId }] },
      },
      include: conversationInclude,
    });
  res.status(existingId ? 200 : 201).json({ conversation: serializeConversation(conversation, req.auth.id, 0) });
}));

router.get('/conversations/:id', authenticate, asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid conversation ID.' });
  if (!await requireParticipant(id, req.auth.id)) return res.status(403).json({ message: 'Conversation access denied.' });

  const now = new Date();
  const unread = await prisma.message.findMany({ where: { conversationId: id, receiverId: Number(req.auth.id), isRead: false }, select: { id: true, senderId: true } });
  if (unread.length) {
    await prisma.message.updateMany({ where: { id: { in: unread.map((m) => m.id) } }, data: { isRead: true, readAt: now } });
    const senderIds = [...new Set(unread.map((m) => m.senderId))];
    senderIds.forEach((senderId) => emitToUser(senderId, 'message:read', { conversationId: id, messageIds: unread.map((m) => m.id), readAt: now }));
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { ...conversationInclude, messages: { orderBy: { createdAt: 'asc' } } },
  });
  res.json({ conversation: serializeConversation(conversation, req.auth.id, 0), messages: conversation.messages });
}));

router.post('/conversations/:id/messages', authenticate, asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid conversation ID.' });
  if (!await requireParticipant(id, req.auth.id)) return res.status(403).json({ message: 'Conversation access denied.' });
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ message: 'Message text is required.' });

  const participant = await prisma.participant.findFirst({ where: { conversationId: id, userId: { not: Number(req.auth.id) } }, include: { user: true } });
  if (!participant) return res.status(400).json({ message: 'Recipient not found.' });
  const deliveredAt = isUserOnline(participant.userId) ? new Date() : null;

  const message = await prisma.$transaction(async (tx) => {
    const saved = await tx.message.create({
      data: { conversationId: id, senderId: Number(req.auth.id), receiverId: participant.userId, text, deliveredAt },
    });
    await tx.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
    return saved;
  });

  await createNotification({
    userId: participant.userId,
    title: 'Yeni mesajınız var',
    message: text.length > 120 ? `${text.slice(0, 117)}...` : text,
    type: 'new_message',
    link: `/profil/mesajlar?conversation=${message.conversationId}`,
  });

  emitToUser(participant.userId, 'message:new', { message });
  if (deliveredAt) emitToUser(req.auth.id, 'message:delivered', { conversationId: id, messageId: message.id, deliveredAt });
  res.status(201).json({ message });
}));

module.exports = router;
