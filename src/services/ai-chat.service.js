const prisma = require('../lib/prisma');
const { generateBestHomeReply } = require('./gemini.service');

const MAX_MESSAGE_LENGTH = 1200;
const HANDOFF_RE = /\b(whatsapp|operator|menecer|insan|əməkdaş|canlı|zəng|elaqe|əlaqə)\b/i;
const cleanText = (value, max = 255) => String(value || '').trim().slice(0, max);
const jsonId = value => (value == null ? null : String(value));
const money = (value, currency = 'AZN') => (value == null ? '' : `${String(value).replace(/\.00$/, '')} ${currency || 'AZN'}`);
const contains = value => ({ contains: value, mode: 'insensitive' });
const CARD_REPLY = 'Sizə uyğun nəticələri aşağıda göstərdim.';
const SEARCH_STOPWORDS = new Set(['kiraye', 'rent', 'icare', 'menzil', 'ev', 'elan', 'axtar', 'tap', 'haqqinda', 'melumat', 'layihe', 'layiheler', 'proyekt', 'satis', 'satiliq', 'daha', 'cox', 'çox', 'goster', 'göstər']);
const DEFAULT_SUGGESTIONS = ['Sea Breeze-də 1 otaqlı', 'Satış elanları', 'Layihələr', 'WhatsApp ilə əlaqə'];
const SALE_LISTING_TYPE_FILTER = [{ listingType: contains('Satış') }, { listingType: contains('Satis') }, { listingType: contains('sale') }];
const RENT_LISTING_TYPE_FILTER = [{ listingType: contains('kirayə') }, { listingType: contains('kiraye') }, { listingType: contains('rent') }, { listingType: contains('icarə') }, { listingType: contains('icare') }];
const MORE_RE = /daha\s*(cox|çox)|novbeti|növbəti|artiq|artıq/i;
const PAGE_SIZE = 3;
const MAX_RESULT_CACHE = 60;
const conversationResultState = new Map();

function serializeMessage(row) { return { id: jsonId(row.id), conversationId: jsonId(row.conversationId), role: row.role, content: row.content, createdAt: row.createdAt }; }
function serializeConversation(row) { const last = row.messages?.[0]; return { id: jsonId(row.id), visitorId: row.visitorId, userId: jsonId(row.userId), name: row.name, phone: row.phone, status: row.status, lastMessageAt: row.lastMessageAt || row.updatedAt || row.createdAt, lastMessage: last?.content || null, lead: row.lead || null }; }
function listingCard(row) { const id = jsonId(row.id); return { id, listingId: id, title: row.title, price: money(row.price, row.currency), projectName: row.projectName, district: row.district, settlement: row.settlement, location: [row.district, row.settlement].filter(Boolean).join(', '), roomCount: row.roomCount, area: row.area, imageUrl: row.imageUrl || row.images?.[0]?.imageUrl || '', url: `/elan/${id}` }; }

function normalizeAz(value) { return String(value || '').toLowerCase().replace(/ı/g, 'i').replace(/ə/g, 'e').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c'); }
function normalizedWords(value) { return normalizeAz(value).replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean); }
function normalizeListingType(value) {
  const normalized = normalizeAz(String(value || '')).replace(/[^a-z0-9]+/g, ' ').trim();
  if (/\b(satis|sale)\b/.test(normalized)) return 'sale';
  if (/\b(kiraye|rent|icare)\b/.test(normalized)) return 'rent';
  return '';
}
function normalizedCompact(value) { return normalizedWords(value).join(' '); }
function projectAliases(project) {
  const aliases = Array.isArray(project.aliases) ? project.aliases : (project.aliases && typeof project.aliases === 'object' ? Object.values(project.aliases) : []);
  return [project.title, project.slug, project.zone, project.mapLocationLabel, ...aliases].filter(Boolean).map(normalizedCompact);
}
function projectMatchScore(project, query) {
  const q = normalizedCompact(query);
  const words = normalizedWords(query).filter(w => w.length > 2);
  if (!q || !words.length) return 0;
  let score = 0;
  for (const alias of projectAliases(project)) {
    if (!alias) continue;
    if (alias === q) score = Math.max(score, 100);
    if (alias.includes(q) || q.includes(alias)) score = Math.max(score, 85);
    const aliasWords = new Set(alias.split(/\s+/));
    const hits = words.filter(w => aliasWords.has(w) || alias.includes(w)).length;
    if (hits) score = Math.max(score, hits * 18 + (hits === words.length ? 25 : 0));
  }
  return score;
}
function stripMarkdown(value) { return String(value || '').replace(/[*#_`>~]/g, '').replace(/^-\s+/gm, '').trim(); }
function intentFor(message) {
  const text = normalizeAz(message);
  const isWhatsApp = /\bwhatsapp\b|elaqe|zeng|operator|emekdas|menecer/.test(text);
  const hasListingIntent = /kiraye|rent|icare|satis|satiliq|otaq|menzil|ev|villa|elan/.test(text);
  const wantsProject = /layihe|proyekt|tikili|kompleks|haqqinda|melumat/.test(text) || (!hasListingIntent && normalizedWords(message).filter(w => w.length > 2).length >= 1);
  const wantsListing = /elan|ev|menzil|villa|obyekt|ofis|otaq|satis|satiliq|kiraye|rent|icare|axtar|tap|seabreeze|sea breeze/.test(text);
  const sale = /satis|satiliq|almaq|alim/.test(text);
  const rent = /kiraye|rent|icare/.test(text);
  const room = text.match(/(\d+)\s*(?:otaq|otaqli|otaqliq)/)?.[1];
  return { isWhatsApp, wantsProject, wantsListing, sale, rent, room: room ? Number(room) : null };
}
function listingWhereFor(message) {
  const intent = intentFor(message);
  const where = { status: 'approved' };
  if (intent.sale && !intent.rent) where.OR = SALE_LISTING_TYPE_FILTER;
  if (intent.rent && !intent.sale) where.OR = RENT_LISTING_TYPE_FILTER;
  if (intent.room) where.roomCount = intent.room;
  return where;
}
function directReply(message) {
  const text = normalizeAz(message);
  const name = String(message || '').match(/(?:adim|adım)\s+([A-Za-zƏəĞğİıÖöŞşÜüÇç]+)/i)?.[1];
  if (name) return `Çox xoşdur, ${name} bəy. Sizə hansı əmlak üzrə kömək edim?`;
  if (/yas(in|ın)|nece(di|dir)|kims(en|iniz)|suni intellekt|melumatlari ne esasinda|n[eə] [eə]sasinda/.test(text)) return 'Mən süni intellekt köməkçisiyəm, yaşım yoxdur. Məlumatları BestHome.az saytındakı təsdiqlənmiş elanlar, layihələr və əlavə edilmiş məlumat bazası əsasında verirəm.';
  if (/^(salam|salamlar|hello|hi|sag ol|t[eə]s[eə]kk[uü]r)/.test(text)) return 'Salam! Sizə satış, kirayə və ya layihələr üzrə kömək edə bilərəm. Nə axtarırsınız?';
  if (/tap\.az|bina\.az|lalafo|turbo\.az|facebook|instagram|google/.test(text)) return 'Mən əsasən BestHome.az-dakı elanlar və layihələr üzrə kömək edirəm. Bu mövzu haqqında ümumi məlumat verə bilərəm, amma BestHome məlumatları qədər dəqiq olmaya bilər. Siz müqayisə üçün soruşursunuz?';
  return null;
}

function projectCard(row) { return { id: jsonId(row.id), title: row.title, shortDescription: cleanText(row.description, 120), location: row.zone || row.mapLocationLabel || '', status: row.isArchived ? 'archived' : 'active', deliveryStatus: row.deliveryDate || (row.isArchived ? 'Arxiv' : 'Aktiv'), deliveryYear: row.deliveryDate || '', areaRange: row.areaRange || row.apartmentAreas || row.area || '', floorCount: row.floorCount || '', imageUrl: row.imageUrl || '', url: row.slug ? `/layihe/${row.slug}` : `/layihe/${row.id}` }; }
function projectDetailReply(project) {
  return [
    cleanText(project.description, 280),
    `Təhvil/status: ${project.deliveryDate || (project.isArchived ? 'Arxiv' : 'Aktiv')}`,
    `Sahə aralığı: ${project.areaRange || project.apartmentAreas || project.area || 'Qeyd edilməyib'}`,
    project.floorCount ? `Mərtəbə sayı: ${project.floorCount}` : '',
    'Aşağıda baxa bilərsiniz.'
  ].filter(Boolean).join('\n');
}

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

function cacheKeyFor(conversationId, message) {
  return `${conversationId || 'anon'}:${normalizedCompact(message).slice(0, 140)}`;
}
function paginateCachedResult(conversationId, message) {
  const key = cacheKeyFor(conversationId, message);
  const cached = conversationResultState.get(key);
  if (!cached) return null;
  const listingStart = cached.offsets.listings;
  const projectStart = cached.offsets.projects;
  const listings = cached.listings.slice(listingStart, listingStart + PAGE_SIZE);
  const projects = cached.projects.slice(projectStart, projectStart + PAGE_SIZE);
  cached.offsets.listings = listingStart + listings.length;
  cached.offsets.projects = projectStart + projects.length;
  return {
    listings,
    projects,
    knowledge: cached.knowledge,
    intent: cached.intent,
    wantsMore: true,
    fromCache: true,
    hasMoreListings: cached.offsets.listings < cached.listings.length,
    hasMoreProjects: cached.offsets.projects < cached.projects.length,
    totalListings: cached.listings.length,
    totalProjects: cached.projects.length
  };
}
async function searchContext(query, conversationId, originalQuery = query) {
  const intent = intentFor(query);
  const wantsMore = MORE_RE.test(normalizeAz(query));
  if (wantsMore) {
    const cached = paginateCachedResult(conversationId, originalQuery || query);
    if (cached) return cached;
  }
  const terms = normalizedWords(cleanText(query, 100)).filter(t => t.length > 2 && !SEARCH_STOPWORDS.has(t) && !/^\d+$/.test(t)).slice(0, 4);
  const listingOR = terms.flatMap(t => [{ title: contains(t) }, { projectName: contains(t) }, { district: contains(t) }, { settlement: contains(t) }, { neighborhood: contains(t) }, { streetAddress: contains(t) }, { listingType: contains(t) }, { propertyCategory: contains(t) }]);
  const projectOR = terms.flatMap(t => [{ title: contains(t) }, { description: contains(t) }, { zone: contains(t) }, { mapLocationLabel: contains(t) }]);
  const knowledgeOR = terms.flatMap(t => [{ title: contains(t) }, { content: contains(t) }, { type: contains(t) }]);
  const shouldUseListingTerms = listingOR.length && (!intent.room || /sea\s*breeze|seabreeze/i.test(normalizeAz(query)));
  const baseListingWhere = listingWhereFor(query);
  const listingWhere = { ...baseListingWhere };
  if (shouldUseListingTerms) listingWhere.AND = [...(listingWhere.AND || []), { OR: listingOR }];
  const projectWhere = { isArchived: false, ...(projectOR.length && !/^layihələr$/i.test(cleanText(query)) ? { OR: projectOR } : {}) };
  const [rawListingRows, projects, knowledge] = await Promise.all([
    intent.wantsListing ? prisma.listing.findMany({ where: listingWhere, include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } }, orderBy: [{ featured: 'desc' }, { approvedAt: 'desc' }], take: MAX_RESULT_CACHE }) : Promise.resolve([]),
    intent.wantsProject ? prisma.project.findMany({ where: projectWhere, orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }], take: MAX_RESULT_CACHE }) : Promise.resolve([]),
    prisma.chatKnowledge.findMany({ where: { isActive: true, ...(knowledgeOR.length ? { OR: knowledgeOR } : {}) }, orderBy: { updatedAt: 'desc' }, take: 5 }).catch(() => [])
  ]);
  const listingRows = intent.sale && !intent.rent
    ? rawListingRows.filter(row => normalizeListingType(row.listingType) === 'sale')
    : (intent.rent && !intent.sale ? rawListingRows.filter(row => normalizeListingType(row.listingType) === 'rent') : rawListingRows);
  const rankedProjects = projects.map(project => ({ project, score: projectMatchScore(project, query) })).sort((a, b) => b.score - a.score);
  const matchedProjects = projectOR.length && rankedProjects.some(item => item.score >= 25) ? rankedProjects.filter(item => item.score >= 25).map(item => item.project) : projects;
  const state = { intent, knowledge, listings: listingRows, projects: matchedProjects, offsets: { listings: PAGE_SIZE, projects: PAGE_SIZE } };
  conversationResultState.set(cacheKeyFor(conversationId, query), state);
  if (conversationResultState.size > 500) conversationResultState.delete(conversationResultState.keys().next().value);
  return { listings: listingRows.slice(0, PAGE_SIZE), projects: matchedProjects.slice(0, PAGE_SIZE), knowledge, intent, wantsMore: false, hasMoreListings: listingRows.length > PAGE_SIZE, hasMoreProjects: matchedProjects.length > PAGE_SIZE, totalListings: listingRows.length, totalProjects: matchedProjects.length };
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
  const direct = directReply(message);
  const moreMatch = message.match(/^Daha çox göstər\s+(.+)$/i);
  const searchMessage = moreMatch?.[1] || message;
  const context = direct ? { listings: [], projects: [], knowledge: [], intent: intentFor(message) } : await searchContext(message, conversation.id, searchMessage);
  let reply = direct || (context.fromCache ? CARD_REPLY : await generateBestHomeReply({ message: searchMessage, contextText: buildContextText(context), hasRealEstateContext: Boolean(context.listings.length || context.projects.length || context.knowledge.length) }));
  const showListings = context.intent?.wantsListing && !context.intent?.isWhatsApp;
  const showProjects = context.intent?.wantsProject && !context.intent?.isWhatsApp;
  const hasCards = (showListings && context.listings.length) || (showProjects && context.projects.length);
  if (hasCards) reply = CARD_REPLY;
  else if (context.intent?.rent && context.intent?.wantsListing) reply = 'Hazırda bazada kirayə elan tapmadım. İstəsəniz satış elanlarına baxa bilərsiniz.';
  else if (!direct && (context.intent?.wantsListing || context.intent?.wantsProject)) reply = 'Bazada uyğun nəticə tapmadım. İstəsəniz kriteriyanı dəyişək və ya WhatsApp dəstəyə yönləndirək.';
  reply = stripMarkdown(reply);
  await saveMessage(conversation.id, 'assistant', reply);
  if (HANDOFF_RE.test(message)) await prisma.chatConversation.update({ where: { id: conversation.id }, data: { status: 'human_needed' } });
  return { conversationId: jsonId(conversation.id), reply, suggestions: hasCards ? [] : (context.intent?.rent && context.intent?.wantsListing ? ['Satış elanlarına bax'] : DEFAULT_SUGGESTIONS), matchedListings: showListings ? context.listings.slice(0, PAGE_SIZE).map(listingCard) : [], matchedProjects: showProjects ? context.projects.slice(0, PAGE_SIZE).map(projectCard) : [], hasMoreListings: Boolean(showListings && context.hasMoreListings), hasMoreProjects: Boolean(showProjects && context.hasMoreProjects) };
}
async function history(conversationId) { const messages = await prisma.chatMessage.findMany({ where: { conversationId: String(conversationId) }, orderBy: { createdAt: 'asc' }, take: 100 }); return { conversationId: String(conversationId), messages: messages.map(serializeMessage) }; }

async function adminList() {
  try {
    const rows = await prisma.chatConversation.findMany({ include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 }, lead: true }, orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }], take: 100 });
    return rows.map(serializeConversation);
  } catch (error) {
    console.warn('[ai-chat] Prisma admin conversation list failed, using schema-safe SQL fallback:', error.message);
    const columns = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'chat_conversations'`;
    const names = new Set(columns.map(col => col.column_name));
    const visitorExpr = names.has('visitor_id') ? 'c.visitor_id' : 'NULL';
    const userExpr = names.has('user_id') ? 'c.user_id::text' : 'NULL';
    const nameExpr = names.has('name') ? 'c.name' : 'NULL';
    const phoneExpr = names.has('phone') ? 'c.phone' : 'NULL';
    const statusExpr = names.has('status') ? 'c.status' : `'open'`;
    const createdExpr = names.has('created_at') ? 'c.created_at' : 'NOW()';
    const updatedExpr = names.has('updated_at') ? 'c.updated_at' : createdExpr;
    const lastExpr = ['last_message_at', 'updated_at', 'created_at'].filter(name => names.has(name)).map(name => `c.${name}`).join(', ') || 'NOW()';
    const rows = await prisma.$queryRawUnsafe(`
      SELECT c.id::text, ${visitorExpr} AS "visitorId", ${userExpr} AS "userId", ${nameExpr} AS "name", ${phoneExpr} AS "phone", ${statusExpr} AS "status",
             COALESCE(${lastExpr}) AS "lastMessageAt", ${createdExpr} AS "createdAt", ${updatedExpr} AS "updatedAt",
             m.content AS "lastMessage"
      FROM chat_conversations c
      LEFT JOIN LATERAL (
        SELECT content FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
      ) m ON true
      ORDER BY COALESCE(${lastExpr}) DESC
      LIMIT 100`);
    return rows.map(row => ({ id: jsonId(row.id), visitorId: row.visitorId, userId: jsonId(row.userId), name: row.name, phone: row.phone, status: row.status, lastMessageAt: row.lastMessageAt || row.updatedAt || row.createdAt, lastMessage: row.lastMessage || null, lead: null }));
  }
}
async function adminGet(id) { const row = await prisma.chatConversation.findUnique({ where: { id: String(id) }, include: { messages: { orderBy: { createdAt: 'asc' } }, lead: true } }); return row ? { ...serializeConversation(row), messages: row.messages.map(serializeMessage) } : null; }
async function adminReply(id, message) { await saveMessage(id, 'admin', message); await prisma.chatConversation.update({ where: { id: String(id) }, data: { status: 'human_needed' } }); return adminGet(id); }
async function adminStatus(id, status) { if (!['open', 'closed', 'human_needed'].includes(status)) { const error = new Error('Invalid status.'); error.status = 400; throw error; } return serializeConversation(await prisma.chatConversation.update({ where: { id: String(id) }, data: { status } })); }
module.exports = { MAX_MESSAGE_LENGTH, normalizeListingType, startConversation, sendMessage, history, adminList, adminGet, adminReply, adminStatus };
