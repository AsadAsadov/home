const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

function toInt(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseJsonArray(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (_error) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return undefined;
}

function toBool(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on', 'aktiv'].includes(String(value).toLowerCase());
}

function toDecimal(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

const serializers = {
  project: (body) => ({
    title: body.title,
    category: body.category,
    deliveryDate: body.delivery_date ?? body.deliveryDate,
    floorCount: body.floor_count ?? body.floorCount,
    area: body.area,
    apartmentCount: body.apartment_count ?? body.apartmentCount,
    repairStatus: body.repair_status ?? body.repairStatus,
    features: Array.isArray(body.features) ? body.features.join(' / ') : body.features,
    description: body.description,
    imageUrl: body.image_url ?? body.imageUrl,
    images: parseJsonArray(body.images),
  }),
  listing: (body) => {
    const area = toDecimal(body.area);
    const price = toDecimal(body.price);
    return {
      title: body.title,
      listingType: body.listing_type ?? body.listingType,
      propertyCategory: body.property_category ?? body.propertyCategory,
      projectName: body.project_name ?? body.projectName,
      roomCount: toInt(body.room_count ?? body.roomCount),
      area,
      floorCount: body.floor_count ?? body.floorCount,
      price,
      pricePerM2: toDecimal(body.price_per_m2 ?? body.pricePerM2) ?? (area && price ? price / area : undefined),
      imageUrl: body.image_url ?? body.imageUrl,
      description: body.description,
      userId: toInt(body.user_id ?? body.userId),
    };
  },
  vacancy: (body) => ({
    title: body.title,
    employmentType: body.employment_type ?? body.employmentType,
    salary: body.salary,
    city: body.city,
    description: body.description,
    isActive: toBool(body.is_active ?? body.isActive),
  }),
  application: (body) => ({
    fullname: body.fullname,
    phone: body.phone,
    vacancyId: toInt(body.vacancy_id ?? body.vacancyId),
    cvFile: body.cv_file ?? body.cvFile,
  }),
};

function compact(data) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function crudRouter({ router, prisma, model, serializer, publicRead = true, publicCreate = false, include }) {
  const readGuard = publicRead ? [] : [authenticate];
  const writeGuard = publicCreate ? [] : [authenticate, authorize('admin', 'employee')];

  router.get('/', ...readGuard, asyncHandler(async (_req, res) => {
    const data = await prisma[model].findMany({ orderBy: { createdAt: 'desc' }, include });
    res.json(data);
  }));

  router.get('/:id', ...readGuard, asyncHandler(async (req, res) => {
    const data = await prisma[model].findUnique({ where: { id: Number(req.params.id) }, include });
    if (!data) return res.status(404).json({ message: 'Record not found.' });
    return res.json(data);
  }));

  router.post('/', ...writeGuard, asyncHandler(async (req, res) => {
    const data = compact(serializer(req.body, req));
    const created = await prisma[model].create({ data, include });
    res.status(201).json(created);
  }));

  router.put('/:id', ...writeGuard, asyncHandler(async (req, res) => {
    const data = compact(serializer(req.body, req));
    const updated = await prisma[model].update({ where: { id: Number(req.params.id) }, data, include });
    res.json(updated);
  }));

  router.delete('/:id', ...writeGuard, asyncHandler(async (req, res) => {
    await prisma[model].delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  }));
}

module.exports = { crudRouter, serializers, compact };
