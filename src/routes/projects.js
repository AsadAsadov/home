const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const { makeUniqueSlug, normalizeManualSlug } = require('../utils/seo');
const { projectImportPreview, upsertProjectImports } = require('../utils/projectBulkImport');
const { orderedProjectRows, projectOrderBy } = require('../utils/projectOrdering');
const { createUpload, localUploadUrl } = require('../middleware/upload');
const { generateProjectBrochurePdf } = require('../utils/projectBrochurePdf');
const pdfUpload = createUpload('project-brochures', {
  fileSize: 50 * 1024 * 1024,
  files: 1,
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
});
const router = express.Router();


function cleanText(value, maxLength = 2000) {
  const text = String(value || '').replace(/\0/g, '').trim();
  return text ? text.slice(0, maxLength) : '';
}

function projectPdfFilename(project) {
  const title = cleanText(project?.title || 'Project', 140).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Project';
  return `${title}.pdf`;
}


function asciiHeaderFilename(filename) {
  return cleanText(filename || 'Project.pdf', 180)
    .replace(/Ə/g, 'E').replace(/ə/g, 'e')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/[^ -~]+/g, '')
    .replace(/["\\]+/g, '')
    .trim() || 'Project.pdf';
}

function normalizeInquiryStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return ['new', 'contacted', 'closed'].includes(status) ? status : null;
}

function pagination(query) {
  const page = Math.max(Number.parseInt(query.page || '1', 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit || '20', 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

function deliveryYearWhere(year) {
  if (!year) return undefined;
  const value = String(year).trim();
  if (!/^\d{4}$/.test(value)) return undefined;
  return { deliveryDate: { contains: value, mode: 'insensitive' } };
}

function legacyOrderedProjectRows(rows) {
  return [...rows].sort((a, b) => (a.displayOrder ?? a.id) - (b.displayOrder ?? b.id) || a.id - b.id);
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseProjectOrder(body) {
  const raw = Array.isArray(body?.order) ? body.order : (Array.isArray(body?.projects) ? body.projects : []);
  return raw
    .map((item, index) => ({
      id: Number.parseInt(typeof item === 'object' ? item.id : item, 10),
      displayOrder: Number.parseInt(typeof item === 'object' && item.displayOrder != null ? item.displayOrder : index + 1, 10),
    }))
    .filter((item) => Number.isInteger(item.id) && item.id > 0 && Number.isInteger(item.displayOrder));
}

router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { page, limit, skip, take } = pagination(req.query);
  const returnAll = String(req.query.all || '').toLowerCase() === 'true';
  const clauses = [{ isArchived: false }];
  if (q) clauses.push({ OR: [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] });
  const yearClause = deliveryYearWhere(req.query.deliveryYear);
  if (yearClause) clauses.push(yearClause);
  const where = { AND: clauses };
  const [data, total] = await Promise.all([
    prisma.project.findMany({ where, orderBy: projectOrderBy, ...(returnAll ? {} : { skip, take }) }),
    prisma.project.count({ where }),
  ]);
  res.json({ data: orderedProjectRows(data), total, page: returnAll ? 1 : page, totalPages: returnAll ? 1 : Math.max(Math.ceil(total / limit), 1) });
}));

router.post('/bulk/preview', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body?.projects) ? req.body.projects : [];
  const projects = await prisma.project.findMany({ orderBy: { id: 'asc' } });
  res.json({ rows: projectImportPreview(rows, projects) });
}));

router.post('/bulk', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body?.projects) ? req.body.projects : [];
  const result = await prisma.$transaction((tx) => upsertProjectImports(tx, rows));
  res.json(result);
}));

router.put('/reorder', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const items = parseProjectOrder(req.body);
  if (!items.length) return res.status(400).json({ message: 'Project order array is required.' });

  const uniqueIds = new Set(items.map((item) => item.id));
  if (uniqueIds.size !== items.length) return res.status(400).json({ message: 'Project IDs must be unique.' });

  await prisma.$transaction(items.map((item) => (
    prisma.project.update({ where: { id: item.id }, data: { displayOrder: item.displayOrder } })
  )));

  const data = await prisma.project.findMany({ where: { isArchived: false }, orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] });
  res.json({ ok: true, data: legacyOrderedProjectRows(data) });
}));


router.get('/archived', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const data = await prisma.project.findMany({
    where: { isArchived: true },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
  });
  res.json(legacyOrderedProjectRows(data));
}));

router.patch('/:id/archive', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const archiveValue = req.body?.isArchived ?? req.body?.is_archived;
  if (archiveValue === undefined || archiveValue === null || archiveValue === '') {
    return res.status(400).json({ message: 'isArchived is required.' });
  }
  const isArchived = parseBool(archiveValue);
  const updated = await prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: Number(req.params.id) },
      data: { isArchived, ...(isArchived ? { featuredInHero: false } : {}) },
    });
    if (isArchived) {
      await tx.heroSlide.updateMany({ where: { projectId: project.id }, data: { isActive: false } });
    }
    return project;
  });
  res.json(updated);
}));


router.patch('/:id/hero', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const updated = await prisma.project.update({
    where: { id: Number(req.params.id) },
    data: { featuredInHero: parseBool(req.body?.featured_in_hero ?? req.body?.featuredInHero) },
  });
  res.json(updated);
}));


router.get('/inquiries', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const q = cleanText(req.query.q, 120).toLowerCase();
  const projectId = Number.parseInt(req.query.projectId || req.query.project_id || '', 10);
  const where = {};
  if (Number.isInteger(projectId) && projectId > 0) where.projectId = projectId;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { note: { contains: q, mode: 'insensitive' } },
    ];
  }
  const data = await prisma.projectInquiry.findMany({ where, include: { project: { select: { id: true, title: true, slug: true } } }, orderBy: { createdAt: 'desc' } });
  res.json(data);
}));

router.patch('/inquiries/:inquiryId', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const status = normalizeInquiryStatus(req.body?.status);
  if (!status) return res.status(400).json({ message: 'Valid status is required.' });
  const updated = await prisma.projectInquiry.update({ where: { id: Number(req.params.inquiryId) }, data: { status }, include: { project: { select: { id: true, title: true, slug: true } } } });
  res.json(updated);
}));

router.delete('/inquiries/:inquiryId', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.projectInquiry.delete({ where: { id: Number(req.params.inquiryId) } });
  res.status(204).send();
}));

router.post('/:id/view', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.project.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  res.json({ id: updated.id, viewCount: updated.viewCount });
}));

router.post('/:id/click', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.project.update({ where: { id }, data: { clickCount: { increment: 1 } } });
  res.json({ id: updated.id, clickCount: updated.clickCount });
}));

router.post('/:id/inquiries', asyncHandler(async (req, res) => {
  const projectId = Number(req.params.id);
  const name = cleanText(req.body?.name, 180);
  const phone = cleanText(req.body?.phone, 80);
  const note = cleanText(req.body?.note, 2000);
  if (!name || !phone) return res.status(400).json({ message: 'Name and phone are required.' });
  const created = await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: projectId }, data: { inquiryCount: { increment: 1 } } });
    return tx.projectInquiry.create({ data: { projectId, name, phone, note: note || null }, include: { project: { select: { id: true, title: true, slug: true } } } });
  });
  res.status(201).json(created);
}));

router.post('/:id/brochure', authenticate, authorize('admin'), pdfUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'PDF file is required.' });
  const project = await prisma.project.findUnique({ where: { id: Number(req.params.id) } });
  if (!project) return res.status(404).json({ message: 'Record not found.' });
  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { pdfUrl: localUploadUrl(req.file), pdfFilename: projectPdfFilename(project) },
  });
  res.json(updated);
}));

router.delete('/:id/brochure', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const updated = await prisma.project.update({ where: { id: Number(req.params.id) }, data: { pdfUrl: null, pdfFilename: null } });
  res.json(updated);
}));

async function downloadGeneratedBrochure(req, res) {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) return res.status(400).json({ message: 'Valid project id is required.' });

  const project = await prisma.project.findFirst({ where: { id: projectId, isArchived: false } });
  if (!project) return res.status(404).json({ message: 'Record not found.' });

  const pdf = await generateProjectBrochurePdf(project);
  const filename = projectPdfFilename(project);

  await prisma.project.update({ where: { id: project.id }, data: { clickCount: { increment: 1 } } });

  res.status(200);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', pdf.length);
  res.setHeader('Content-Disposition', `attachment; filename="${asciiHeaderFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader('Cache-Control', 'no-store');
  return res.send(pdf);
}

router.get('/:id/brochure/download', asyncHandler(downloadGeneratedBrochure));
router.get('/:id/brochure.pdf', asyncHandler(downloadGeneratedBrochure));
router.get('/:id/pdf', asyncHandler(downloadGeneratedBrochure));

router.get('/slug/:slug', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').trim();
  const data = await prisma.project.findFirst({ where: { slug, isArchived: false } });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  return res.json(data);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await prisma.project.findFirst({ where: { id: Number(req.params.id), isArchived: false } });
  if (!data) return res.status(404).json({ message: 'Record not found.' });
  return res.json(data);
}));

router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const payload = compact(serializers.project(req.body));
  if (!payload.title) return res.status(400).json({ message: 'Project title is required.' });
  const created = await prisma.$transaction(async (tx) => {
    const manualSlug = normalizeManualSlug(payload.slug);
    payload.slug = manualSlug
      ? await makeUniqueSlug({ model: 'project', title: manualSlug, tx, fallback: 'project' })
      : await makeUniqueSlug({ model: 'project', title: payload.title, tx, fallback: 'project' });
    const project = await tx.project.create({ data: payload });
    if (project.displayOrder == null) {
      return tx.project.update({ where: { id: project.id }, data: { displayOrder: project.id } });
    }
    return project;
  });
  res.status(201).json(created);
}));

router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const payload = compact(serializers.project(req.body));
  if (Object.prototype.hasOwnProperty.call(payload, 'slug')) {
    const slug = normalizeManualSlug(payload.slug);
    if (!slug) delete payload.slug;
    else payload.slug = await makeUniqueSlug({ model: 'project', title: slug, currentId: Number(req.params.id), tx: prisma, fallback: 'project' });
  }
  const updated = await prisma.project.update({ where: { id: Number(req.params.id) }, data: payload });
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.project.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
