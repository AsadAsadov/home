const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { emitToUser, isUserOnline, getUserPresence } = require('../utils/realtime');

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

function durationMs(startedAt) {
  return Number(process.hrtime.bigint() - startedAt) / 1e6;
}

function toSafeJson(value) {
  return JSON.parse(JSON.stringify(value, (_key, v) => {
    if (typeof v === 'bigint') return v.toString();
    if (v instanceof Date) return v.toISOString();
    return v;
  }));
}

const safeJson = toSafeJson;

function jsonSafe(res, payload, statusCode) {
  const response = res.status(statusCode || res.statusCode);
  return response.json(toSafeJson(payload));
}

function logMessagesConversationsResponse(data) {
  console.log('[messages/conversations] response data', data);
  return data;
}

function jsonMessagesConversations(res, payload, statusCode) {
  logMessagesConversationsResponse(payload);
  return jsonSafe(res, payload, statusCode);
}

function listingInclude() {
  return { images: { orderBy: { sortOrder: 'asc' }, take: 1 } };
}

const LISTING_CONTEXT_PREFIX = '__BESTHOME_LISTING_CONTEXT__';

function listingContextPayload(listing) {
  if (!listing) return null;
  return {
    id: listing.id,
    listingCode: listing.listingCode || listing.id,
    title: listing.title || 'Elan',
    city: listing.city || '',
    district: listing.district || '',
    settlement: listing.settlement || '',
    price: listing.price == null ? null : String(listing.price),
    currency: listing.currency || 'AZN',
    imageUrl: listing.imageUrl || listing.images?.[0]?.imageUrl || '',
  };
}

async function addListingContextMessage(tx, { conversationId, senderId, receiverId, listing }) {
  const payload = listingContextPayload(listing);
  if (!payload) return null;
  return tx.message.create({
    data: {
      conversationId,
      senderId: Number(senderId),
      receiverId: Number(receiverId),
      text: `${LISTING_CONTEXT_PREFIX}${JSON.stringify(payload)}`,
      isRead: true,
      deliveredAt: new Date(),
      readAt: new Date(),
    },
  });
}

const conversationInclude = {
  participants: { include: { user: { select: { id: true, fullname: true, avatarUrl: true } } } },
  listing: { include: listingInclude() },
  messages: { orderBy: { createdAt: 'desc' }, take: 1 },
};

async function requireParticipant(conversationId, userId) {
  return prisma.participant.findFirst({ where: { conversationId: BigInt(conversationId), userId: Number(userId) } });
}

function serializeMessage(message) {
  if (!message) return null;
  return message.deletedAt ? { ...message, text: 'Bu mesaj silindi' } : message;
}

function serializeConversation(conversation, currentUserId, unreadCount = 0) {
  const other = conversation.participants?.find((participant) => String(participant.userId) !== String(currentUserId)) || conversation.participants?.[0];
  const self = conversation.participants?.find((participant) => String(participant.userId) === String(currentUserId));
  const presence = other?.userId ? getUserPresence(other.userId) : null;
  const rawLastMessage = conversation.messages?.[0] || null;
  const lastMessage = rawLastMessage && (!self?.clearedAt || new Date(rawLastMessage.createdAt).getTime() > new Date(self.clearedAt).getTime()) ? rawLastMessage : null;
  return {
    ...conversation,
    otherUser: other?.user ? {
      ...other.user,
      ...(presence?.isOnline ? { isOnline: true } : {}),
      ...(presence?.lastSeenAt ? { lastSeenAt: presence.lastSeenAt } : {}),
    } : null,
    unreadCount,
    lastMessage: serializeMessage(lastMessage),
  };
}

function otherParticipantKey(conversation, currentUserId) {
  return String(conversation.participants?.find((participant) => String(participant.userId) !== String(currentUserId))?.userId || conversation.id);
}

function dedupeConversationsByParticipantPair(conversations, currentUserId) {
  const seen = new Set();
  return conversations.filter((conversation) => {
    const key = otherParticipantKey(conversation, currentUserId);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function conversationUnreadCounts(userId, conversations) {
  if (!conversations.length) return new Map();
  const clearedAtByConversation = new Map(conversations.map((conversation) => {
    const participant = conversation.participants?.find((item) => String(item.userId) === String(userId));
    return [String(conversation.id), participant?.clearedAt || null];
  }));
  const grouped = await prisma.message.groupBy({
    by: ['conversationId'],
    where: { conversationId: { in: conversations.map((item) => item.id) }, receiverId: Number(userId), isRead: false },
    _count: { _all: true },
  });
  if (!grouped.length) return new Map();
  const counts = new Map(grouped.map((row) => [String(row.conversationId), row._count._all]));
  const conversationsWithClearedAt = [...clearedAtByConversation.entries()].filter(([, clearedAt]) => clearedAt);
  if (!conversationsWithClearedAt.length) return counts;
  await Promise.all(conversationsWithClearedAt.map(async ([conversationId, clearedAt]) => {
    const count = await prisma.message.count({
      where: { conversationId: BigInt(conversationId), receiverId: Number(userId), isRead: false, createdAt: { gt: clearedAt } },
    });
    counts.set(conversationId, count);
  }));
  return counts;
}

function currentParticipant(conversation, userId) {
  return conversation.participants?.find((participant) => String(participant.userId) === String(userId)) || null;
}

function isConversationVisibleForParticipant(conversation, userId) {
  const participant = currentParticipant(conversation, userId);
  if (!participant?.hiddenAt) return true;
  return new Date(conversation.updatedAt).getTime() > new Date(participant.hiddenAt).getTime();
}

async function markDeliveredInBackground(userId) {
  const deliveredNow = new Date();
  const undelivered = await prisma.message.findMany({
    where: { receiverId: Number(userId), deliveredAt: null },
    select: { id: true, senderId: true, conversationId: true },
  });
  if (!undelivered.length) return;
  await prisma.message.updateMany({ where: { id: { in: undelivered.map((m) => m.id) } }, data: { deliveredAt: deliveredNow } });
  undelivered.forEach((message) => emitToUser(message.senderId, 'message:delivered', safeJson({ conversationId: message.conversationId, messageId: message.id, deliveredAt: deliveredNow })));
}

async function listConversations(req, res) {
  markDeliveredInBackground(req.auth.id).catch((error) => console.warn('[messages] delivered background failed', { userId: req.auth.id, message: error.message, code: error.code }));
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: Number(req.auth.id) } } },
    include: conversationInclude,
    orderBy: { updatedAt: 'desc' },
  });
  const visibleConversations = dedupeConversationsByParticipantPair(conversations.filter((conversation) => isConversationVisibleForParticipant(conversation, req.auth.id)), req.auth.id);
  const counts = await conversationUnreadCounts(req.auth.id, visibleConversations);
  return jsonSafe(res, { data: visibleConversations.map((conversation) => serializeConversation(conversation, req.auth.id, counts.get(String(conversation.id)) || 0)) });
}

router.get('/', authenticate, asyncHandler(listConversations));
router.get('/conversations', authenticate, asyncHandler(listConversations));

router.post('/conversations', authenticate, asyncHandler(async (req, res) => {
  const startedAt = process.hrtime.bigint();
  try {
    const listingId = toBigIntId(req.body.listingId ?? req.body.listing_id);
    let receiverId = toIntId(req.body.receiverId ?? req.body.receiver_id);
    let listing = null;

    if (listingId) {
      listing = await prisma.listing.findUnique({ where: { id: listingId }, include: listingInclude() });
      if (!listing || listing.status !== 'approved') return jsonMessagesConversations(res, { message: 'Listing not found.' }, 404);
      receiverId = toIntId(listing.userId);
    }
    if (!receiverId) return jsonMessagesConversations(res, { message: 'Recipient is required.' }, 400);
    if (String(receiverId) === String(req.auth.id)) return jsonMessagesConversations(res, { message: 'Öz elanınıza mesaj yaza bilməzsiniz.' }, 400);

    const participantIds = [Number(req.auth.id), receiverId];
    const existingParticipants = await prisma.participant.findMany({
      where: { userId: { in: participantIds } },
      select: { conversationId: true },
    });
    const participantCounts = existingParticipants.reduce((acc, participant) => {
      const key = String(participant.conversationId);
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map());
    const matchingIds = [...participantCounts.entries()].filter(([, count]) => count === 2).map(([conversationId]) => BigInt(conversationId));
    const existing = matchingIds.length ? await prisma.conversation.findFirst({
      where: { id: { in: matchingIds } },
      orderBy: { updatedAt: 'desc' },
      include: conversationInclude,
    }) : null;

    const shouldUpdateListingContext = existing && listingId && String(existing.listingId || '') !== String(listingId);
    const shouldAddListingContextMessage = listing && (!existing || shouldUpdateListingContext);
    const conversation = await prisma.$transaction(async (tx) => {
      const saved = existing
        ? (shouldUpdateListingContext
          ? await tx.conversation.update({
            where: { id: existing.id },
            data: { listingId, updatedAt: new Date() },
            include: conversationInclude,
          })
          : existing)
        : await tx.conversation.create({
          data: {
            listingId,
            participants: { create: [{ userId: Number(req.auth.id) }, { userId: receiverId }] },
          },
          include: conversationInclude,
        });
      if (shouldAddListingContextMessage) {
        await addListingContextMessage(tx, { conversationId: saved.id, senderId: req.auth.id, receiverId, listing });
        return tx.conversation.findUnique({ where: { id: saved.id }, include: conversationInclude });
      }
      return saved;
    });
    console.log('[messages] create/open conversation durationMs', { userId: req.auth.id, conversationId: conversation.id, existing: Boolean(existing), durationMs: Math.round(durationMs(startedAt)) });
    return jsonMessagesConversations(res, { conversation: serializeConversation(conversation, req.auth.id, 0) }, existing ? 200 : 201);
  } catch (error) {
    console.error('[messages] create/open conversation failed', { userId: req.auth.id, durationMs: Math.round(durationMs(startedAt)), message: error.message, code: error.code, meta: error.meta });
    throw error;
  }
}));

router.get('/conversations/:id', authenticate, asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return jsonSafe(res, { message: 'Invalid conversation ID.' }, 400);
  if (!await requireParticipant(id, req.auth.id)) return jsonSafe(res, { message: 'Conversation access denied.' }, 403);

  const now = new Date();
  const unread = await prisma.message.findMany({ where: { conversationId: id, receiverId: Number(req.auth.id), isRead: false }, select: { id: true, senderId: true } });
  if (unread.length) {
    await prisma.message.updateMany({ where: { id: { in: unread.map((m) => m.id) } }, data: { isRead: true, readAt: now } });
    const senderIds = [...new Set(unread.map((m) => m.senderId))];
    senderIds.forEach((senderId) => emitToUser(senderId, 'message:read', safeJson({ conversationId: id, messageIds: unread.map((m) => m.id), readAt: now })));
  }

  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '30', 10) || 30, 1), 100);
  const before = req.query.before ? new Date(String(req.query.before)) : null;
  const participant = await requireParticipant(id, req.auth.id);
  const messageWhere = {
    conversationId: id,
    ...(participant?.clearedAt ? { createdAt: { gt: participant.clearedAt } } : {}),
    ...(before && !Number.isNaN(before.getTime()) ? { createdAt: { ...(participant?.clearedAt ? { gt: participant.clearedAt } : {}), lt: before } } : {}),
  };
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { ...conversationInclude, messages: { where: messageWhere, orderBy: { createdAt: 'desc' }, take: limit } },
  });
  return jsonSafe(res, { conversation: serializeConversation(conversation, req.auth.id, 0), messages: (conversation.messages || []).slice().reverse().map(serializeMessage), hasMore: (conversation.messages || []).length === limit });
}));

router.post('/conversations/:id/messages', authenticate, asyncHandler(async (req, res) => {
  const startedAt = process.hrtime.bigint();
  try {
    const id = toBigIntId(req.params.id);
    if (!id) return jsonSafe(res, { message: 'Invalid conversation ID.' }, 400);
    if (!await requireParticipant(id, req.auth.id)) return jsonSafe(res, { message: 'Conversation access denied.' }, 403);
    const text = String(req.body.text || '').trim();
    if (!text) return jsonSafe(res, { message: 'Message text is required.' }, 400);

    const participant = await prisma.participant.findFirst({ where: { conversationId: id, userId: { not: Number(req.auth.id) } }, include: { user: true } });
    if (!participant) return jsonSafe(res, { message: 'Recipient not found.' }, 400);
    const deliveredAt = isUserOnline(participant.userId) ? new Date() : null;

    const message = await prisma.$transaction(async (tx) => {
      const saved = await tx.message.create({
        data: { conversationId: id, senderId: Number(req.auth.id), receiverId: participant.userId, text, deliveredAt },
      });
      await tx.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
      return saved;
    });

    emitToUser(participant.userId, 'message:new', safeJson({ message: serializeMessage(message) }));
    if (deliveredAt) emitToUser(req.auth.id, 'message:delivered', safeJson({ conversationId: id, messageId: message.id, deliveredAt }));
    console.log('[messages] send durationMs', { userId: req.auth.id, conversationId: id, messageId: message.id, receiverId: participant.userId, durationMs: Math.round(durationMs(startedAt)) });
    return jsonSafe(res, { message: serializeMessage(message) }, 201);
  } catch (error) {
    console.error('[messages] send failed', { userId: req.auth.id, conversationId: req.params.id, durationMs: Math.round(durationMs(startedAt)), message: error.message, code: error.code, meta: error.meta });
    throw error;
  }
}));

router.delete('/messages/:messageId', authenticate, asyncHandler(async (req, res) => {
  const messageId = toBigIntId(req.params.messageId);
  if (!messageId) return jsonSafe(res, { message: 'Invalid message ID.' }, 400);
  const existing = await prisma.message.findUnique({ where: { id: messageId }, include: { conversation: { include: { participants: true } } } });
  if (!existing) return jsonSafe(res, { message: 'Message not found.' }, 404);
  if (String(existing.senderId) !== String(req.auth.id)) return jsonSafe(res, { message: 'Yalnız öz mesajınızı silə bilərsiniz.' }, 403);
  if (!await requireParticipant(existing.conversationId, req.auth.id)) return jsonSafe(res, { message: 'Conversation access denied.' }, 403);

  const deletedAt = new Date();
  const deleted = await prisma.message.update({ where: { id: messageId }, data: { deletedAt, deletedById: Number(req.auth.id) } });
  const payload = { conversationId: deleted.conversationId, message: serializeMessage(deleted), messageId: deleted.id, deletedAt, deletedById: Number(req.auth.id) };
  const safePayload = safeJson(payload);
  existing.conversation.participants.forEach((participant) => emitToUser(participant.userId, 'message:deleted', safePayload));
  return jsonSafe(res, safePayload);
}));

router.patch('/conversations/:id/hide', authenticate, asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return jsonSafe(res, { message: 'Invalid conversation ID.' }, 400);
  const participant = await requireParticipant(id, req.auth.id);
  if (!participant) return jsonSafe(res, { message: 'Conversation access denied.' }, 403);
  const hiddenAt = new Date();
  await prisma.participant.update({ where: { id: participant.id }, data: { hiddenAt } });
  emitToUser(req.auth.id, 'conversation:hidden', safeJson({ conversationId: id, hiddenAt }));
  return jsonSafe(res, { success: true, conversationId: id, hiddenAt });
}));

router.patch('/conversations/:id/clear', authenticate, asyncHandler(async (req, res) => {
  const id = toBigIntId(req.params.id);
  if (!id) return jsonSafe(res, { message: 'Invalid conversation ID.' }, 400);
  const participant = await requireParticipant(id, req.auth.id);
  if (!participant) return jsonSafe(res, { message: 'Conversation access denied.' }, 403);
  const clearedAt = new Date();
  await prisma.participant.update({ where: { id: participant.id }, data: { clearedAt } });
  return jsonSafe(res, { success: true, conversationId: id, clearedAt });
}));

module.exports = router;
