const prisma = require('../lib/prisma');
const { generateBestHomeReply } = require('./gemini.service');

const MAX_MESSAGE_LENGTH = 1200;
const HANDOFF_RE = /\b(whatsapp|operator|menecer|insan|əməkdaş|canlı|zəng|elaqe|əlaqə)\b/i;
const cleanText = (value, max = 255) => String(value || '').trim().slice(0, max);
const jsonId = value => (value == null ? null : String(value));
const money = (value, currency = 'AZN') => (value == null ? '' : `${String(value).replace(/\.00$/, '')} ${currency || 'AZN'}`);
const contains = value => ({ contains: value, mode: 'insensitive' });

function serializeMessage(row) { return { id: jsonId(row.id), conversationId: jsonId(row.conversationId), role: row.role, content: row.content, createdAt: row.createdAt }; }
function serializeConversation(row) { const last = row.messages?.[0]; return { id: jsonId(row.id), visitorId: row.visitorId, userId: jsonId(row.userId), name: row.name, phone: row.phone, status: row.status, lastMessageAt: row.lastMessageAt || row.updatedAt || row.createdAt, lastMessage: last?.content || null, lead: row.lead || null }; }
function listingCard(row) { return { id: jsonId(row.id), title: row.title, price: money(row.price, row.currency), projectName: row.projectName, district: row.district, settlement: row.settlement, roomCount: row.roomCount, area: row.area, imageUrl: row.imageUrl || row.images?.[0]?.imageUrl || '', url: `/elan/${row.id}` }; }
function projectCard(row) { return { id: jsonId(row.id), title: row.title, location: row.zone || row.mapLocationLabel || '', status: row.isArchived ? 'archived' : 'active', deliveryYear: row.deliveryDate || '', imageUrl: row.imageUrl || '', url: row.slug ? `/layihe/${row.slug}` : `/layihe/${row.id}` }; }

async function ensureConversation({ conversationId, visitorId, userId, name, phone }) {
  if (conversationId) {
    const existing = await prisma.chatConversation.findUnique({ where: { id: String(conversationId) } });
    if (existing) return existing;
  }
  return prisma.chatConversation.create({ data: { visitorId: cleanText(visitorId, 120) || null, userId: userId ? BigInt(userId) : null, name: cleanText(name, 120) || null, phone: cleanText(phone, 60) || null, status: 'open', lastMessageAt: new Date() } });
}
async function saveMessage(conversationId, role, content) {
  const row = await prisma.chatMessage.create({ data: { conversationId: String(conversationId), role, content: cleanText(content, role === 'user' ? MAX_MESSAGE_LENGTH : 4000) } });
  await prisma.chatConversation.update({ where: { id: String(conversationId) }, data: { lastMessageAt: new Date(), updatedAt: new Date() } });
  return row;
}
async function startConversation(input) { const conversation = await ensureConversation(input || {}); const messages = await prisma.chatMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'asc' }, take: 50 }); return { conversationId: jsonId(conversation.id), messages: messages.map(serializeMessage) }; }

async function searchContext(query) {
  const terms = cleanText(query, 100).split(/\s+/).filter(t => t.length > 2).slice(0, 4);
  const listingOR = terms.flatMap(t => [{ title: contains(t) }, { projectName: contains(t) }, { district: contains(t) }, { settlement: contains(t) }, { listingType: contains(t) }, { propertyCategory: contains(t) }]);
  const projectOR = terms.flatMap(t => [{ title: contains(t) }, { description: contains(t) }, { zone: contains(t) }, { mapLocationLabel: contains(t) }]);
  const knowledgeOR = terms.flatMap(t => [{ title: contains(t) }, { content: contains(t) }, { type: contains(t) }]);
  const [listings, projects, knowledge] = await Promise.all([
    prisma.listing.findMany({ where: { status: 'approved', ...(listingOR.length ? { OR: listingOR } : {}) }, include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } }, orderBy: [{ featured: 'desc' }, { approvedAt: 'desc' }], take: 5 }),
    prisma.project.findMany({ where: { isArchived: false, ...(projectOR.length ? { OR: projectOR } : {}) }, orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }], take: 5 }),
    prisma.chatKnowledge.findMany({ where: { isActive: true, ...(knowledgeOR.length ? { OR: knowledgeOR } : {}) }, orderBy: { updatedAt: 'desc' }, take: 5 }).catch(() => [])
  ]);
  return { listings, projects, knowledge };
}
function buildContextText({ listings, projects, knowledge }) {
  return [
    ...listings.map((l, i) => `Elan ${i + 1}: ${l.title}; layihə: ${l.projectName || '-'}; rayon: ${l.district || '-'}; qəsəbə: ${l.settlement || '-'}; otaq: ${l.roomCount || '-'}; qiymət: ${money(l.price, l.currency) || '-'}; sahə: ${l.area || '-'}; tip: ${l.listingType || '-'}; kateqoriya: ${l.propertyCategory || '-'}.`),
    ...projects.map((p, i) => `Layihə ${i + 1}: ${p.title}; təsvir: ${(p.description || '').slice(0, 500)}; lokasiya: ${p.zone || p.mapLocationLabel || '-'}; təhvil: ${p.deliveryDate || '-'}; status: ${p.isArchived ? 'arxiv' : 'aktiv'}.`),
    ...knowledge.map((k, i) => `Məlumat ${i + 1}: ${k.title}; növ: ${k.type || '-'}; məzmun: ${(k.content || '').slice(0, 700)}.`)
  ].join('\n');
}
async function sendMessage(input) {
  const raw = String(input?.message || '');
  if (!raw.trim()) { const error = new Error('Message is required.'); error.status = 400; throw error; }
  if (raw.length > MAX_MESSAGE_LENGTH) { const error = new Error('Message is too long.'); error.status = 413; throw error; }
  const message = cleanText(raw, MAX_MESSAGE_LENGTH);
  const conversation = await ensureConversation(input || {});
  await saveMessage(conversation.id, 'user', message);
  const context = await searchContext(message);
  const reply = await generateBestHomeReply({ message, contextText: buildContextText(context) });
  await saveMessage(conversation.id, 'assistant', reply);
  if (HANDOFF_RE.test(message)) await prisma.chatConversation.update({ where: { id: conversation.id }, data: { status: 'human_needed' } });
  return { conversationId: jsonId(conversation.id), reply, suggestions: ['Sea Breeze-də 1 otaqlı', 'Satış elanları', 'Kirayə', 'Layihələr', 'WhatsApp ilə əlaqə'], matchedListings: context.listings.map(listingCard), matchedProjects: context.projects.map(projectCard) };
}
async function history(conversationId) { const messages = await prisma.chatMessage.findMany({ where: { conversationId: String(conversationId) }, orderBy: { createdAt: 'asc' }, take: 100 }); return { conversationId: String(conversationId), messages: messages.map(serializeMessage) }; }
async function adminList() { const rows = await prisma.chatConversation.findMany({ include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 }, lead: true }, orderBy: { lastMessageAt: 'desc' }, take: 100 }); return rows.map(serializeConversation); }
async function adminGet(id) { const row = await prisma.chatConversation.findUnique({ where: { id: String(id) }, include: { messages: { orderBy: { createdAt: 'asc' } }, lead: true } }); return row ? { ...serializeConversation(row), messages: row.messages.map(serializeMessage) } : null; }
async function adminReply(id, message) { await saveMessage(id, 'admin', message); await prisma.chatConversation.update({ where: { id: String(id) }, data: { status: 'human_needed' } }); return adminGet(id); }
async function adminStatus(id, status) { if (!['open', 'closed', 'human_needed'].includes(status)) { const error = new Error('Invalid status.'); error.status = 400; throw error; } return serializeConversation(await prisma.chatConversation.update({ where: { id: String(id) }, data: { status } })); }
module.exports = { MAX_MESSAGE_LENGTH, startConversation, sendMessage, history, adminList, adminGet, adminReply, adminStatus };
