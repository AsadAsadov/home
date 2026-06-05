const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

function parseImages(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (_error) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const int = (v) => (v === '' || v == null || Number.isNaN(Number.parseInt(v, 10)) ? null : Number.parseInt(v, 10));

function projectData(p) {
  const images = [...parseImages(p.images), p.image_url || p.imageUrl || p.img || p.picture?.mobile].filter(Boolean);
  return {
    title: p.title || 'Untitled project',
    category: p.category || null,
    deliveryDate: p.delivery_date || p.deliveryDate || p.year || null,
    floorCount: p.floor_count || p.floorCount || p.floors || null,
    area: p.area || null,
    apartmentCount: p.apartment_count || p.apartmentCount || p.apartments || null,
    repairStatus: p.repair_status || p.repairStatus || p.repair || null,
    features: Array.isArray(p.features) ? p.features.join(' / ') : (p.features || null),
    description: p.description || p.desc || null,
    imageUrl: images[0] || null,
    images: images.length ? images : undefined,
    displayOrder: int(p.display_order ?? p.displayOrder ?? p.order),
    isArchived: Boolean(p.is_archived ?? p.isArchived),
  };
}

function listingData(l) {
  const area = l.area === '' || l.area == null ? null : String(l.area);
  const numericArea = num(area);
  const price = num(l.price);
  return {
    title: l.title || 'Untitled listing',
    listingType: l.listing_type || l.listingType || null,
    propertyCategory: l.property_category || l.propertyCategory || l.category || null,
    projectName: l.project_name || l.projectName || l.project || null,
    roomCount: int(l.room_count || l.roomCount || l.rooms),
    area,
    floorNumber: int(l.floor_number || l.floorNumber || l.floor),
    floorCount: l.floor_count || l.floorCount || String(l.floorCount || ''),
    price,
    pricePerM2: num(l.price_per_m2 || l.pricePerM2) || (numericArea && price ? price / numericArea : null),
    imageUrl: l.image_url || l.imageUrl || l.img || null,
    description: l.description || l.desc || null,
    displayOrder: int(l.display_order ?? l.displayOrder ?? l.order),
  };
}

function vacancyData(v) {
  return {
    title: v.title || 'Untitled vacancy',
    employmentType: v.employment_type || v.employmentType || v.type || null,
    salary: v.salary || null,
    city: v.city || v.location || null,
    description: v.description || v.desc || null,
    isActive: v.is_active ?? v.isActive ?? (v.status !== 'Bloklanıb' && v.status !== 'Bloklanmış'),
  };
}


function appData(a) {
  return {
    fullname: a.fullname || `${a.name || ''} ${a.surname || ''}`.trim() || 'Namizəd',
    phone: a.phone || null,
    vacancyId: int(a.vacancy_id || a.vacancyId),
    cvFile: a.cv_file || a.cvFile || a.fileName || null,
  };
}

router.get('/', asyncHandler(async (_req, res) => {
  const [projects, listings, vacancies, applications, users] = await Promise.all([
    prisma.project.findMany({ where: { isArchived: false }, orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] }),
    prisma.listing.findMany({ orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], include: { images: { orderBy: { sortOrder: 'asc' } } } }),
    prisma.vacancy.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.application.findMany({ orderBy: { createdAt: 'desc' }, include: { vacancy: true } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);
  res.json({ projects, listings, vacancies, gallery: [], applications, users: users.map(({ passwordHash, ...u }) => u) });
}));

router.put('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.$transaction(async (tx) => {
    if (Array.isArray(req.body.projects)) {
      await tx.project.deleteMany();
      if (req.body.projects.length) await tx.project.createMany({ data: req.body.projects.map(projectData) });
    }
    if (Array.isArray(req.body.listings)) {
      await tx.listing.deleteMany();
      if (req.body.listings.length) await tx.listing.createMany({ data: req.body.listings.map(listingData) });
    }
    if (Array.isArray(req.body.vacancies)) {
      await tx.application.deleteMany();
      await tx.vacancy.deleteMany();
      if (req.body.vacancies.length) await tx.vacancy.createMany({ data: req.body.vacancies.map(vacancyData) });
    }
    if (Array.isArray(req.body.gallery)) {
      console.warn('[sync] gallery sync payload ignored because gallery writes are disabled for production safety.');
    }
    if (Array.isArray(req.body.applications)) {
      await tx.application.deleteMany();
      if (req.body.applications.length) await tx.application.createMany({ data: req.body.applications.map(appData) });
    }
  });
  res.json({ ok: true });
}));

module.exports = router;
