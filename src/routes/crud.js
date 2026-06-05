const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

function cleanString(value) {
  if (value === undefined || value === null) return undefined;
  const cleaned = String(value).trim();
  return cleaned === '' ? undefined : cleaned;
}

function toInt(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseJsonArray(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => String(item || '').trim()).filter(Boolean);
    return cleaned.length ? cleaned : null;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map((item) => String(item || '').trim()).filter(Boolean);
        return cleaned.length ? cleaned : null;
      }
    } catch (_error) {
      const cleaned = value.split(',').map((item) => item.trim()).filter(Boolean);
      return cleaned.length ? cleaned : null;
    }
  }
  return null;
}

function cleanStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['pending', 'approved', 'rejected'].includes(normalized) ? normalized : undefined;
}

function cleanOwnerType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['owner', 'sahib', 'sahibinden', 'sahibindən', 'əmlak sahibi', 'emlak sahibi'].includes(normalized)) return 'owner';
  if (['agent', 'vasitəçi', 'vasiteci', 'broker', 'realtor'].includes(normalized)) return 'agent';
  return undefined;
}

function toBool(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on', 'aktiv'].includes(String(value).toLowerCase());
}


function cleanCurrency(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim().toUpperCase();
  return ['AZN', 'USD'].includes(normalized) ? normalized : 'AZN';
}

function toDecimal(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toCoordinate(value, min, max) {
  const parsed = toDecimal(value);
  if (parsed === undefined) return undefined;
  return parsed >= min && parsed <= max ? parsed : undefined;
}

const serializers = {
  project: (body) => ({
    title: cleanString(body.title),
    category: cleanString(body.category ?? body.type ?? body.projectType),
    zone: cleanString(body.zone),
    deliveryDate: cleanString(body.delivery_date ?? body.deliveryDate),
    coastline: cleanString(body.coastline),
    seaDistance: cleanString(body.sea_distance ?? body.seaDistance),
    buildingCount: cleanString(body.building_count ?? body.buildingCount),
    floorCount: cleanString(body.floor_count ?? body.floorCount),
    area: cleanString(body.area),
    apartmentCount: cleanString(body.apartment_count ?? body.apartmentCount),
    parkingSpaces: cleanString(body.parking_spaces ?? body.parkingSpaces),
    repairStatus: cleanString(body.repair_status ?? body.repairStatus),
    apartmentFormats: cleanString(body.apartment_formats ?? body.apartmentFormats),
    apartmentAreas: cleanString(body.apartment_areas ?? body.apartmentAreas),
    areaRange: cleanString(body.area_range ?? body.areaRange ?? body.area),
    pricePerM2: cleanString(body.price_per_m2 ?? body.pricePerM2),
    totalPrice: cleanString(body.total_price ?? body.totalPrice),
    bankMortgage: cleanString(body.bank_mortgage ?? body.bankMortgage),
    internalCredit: cleanString(body.internal_credit ?? body.internalCredit),
    downPayment: cleanString(body.down_payment ?? body.downPayment),
    infrastructure: cleanString(body.infrastructure),
    features: Array.isArray(body.features) ? body.features.map(cleanString).filter(Boolean).join(' / ') : cleanString(body.features),
    description: cleanString(body.description),
    imageUrl: cleanString(body.image_url ?? body.imageUrl),
    images: parseJsonArray(body.images),
    displayOrder: toInt(body.display_order ?? body.displayOrder),
    slug: cleanString(body.slug),
    featuredInHero: toBool(body.featured_in_hero ?? body.featuredInHero),
    isArchived: toBool(body.is_archived ?? body.isArchived),
  }),
  listing: (body) => {
    const area = cleanString(body.area);
    const numericArea = toDecimal(area);
    const price = toDecimal(body.price);
    return {
      title: cleanString(body.title),
      listingType: cleanString(body.listing_type ?? body.listingType),
      propertyCategory: cleanString(body.property_category ?? body.propertyCategory),
      propertySubtype: cleanString(body.property_subtype ?? body.propertySubtype),
      projectName: cleanString(body.project_name ?? body.projectName),
      regionType: cleanString(body.region_type ?? body.regionType),
      city: cleanString(body.city),
      district: cleanString(body.district),
      settlement: cleanString(body.settlement),
      neighborhood: cleanString(body.neighborhood),
      metroStation: cleanString(body.metro_station ?? body.metroStation),
      streetAddress: cleanString(body.street_address ?? body.streetAddress),
      latitude: toCoordinate(body.latitude, -90, 90),
      longitude: toCoordinate(body.longitude, -180, 180),
      roomCount: toInt(body.room_count ?? body.roomCount),
      area,
      floorNumber: toInt(body.floor_number ?? body.floorNumber),
      floorCount: cleanString(body.floor_count ?? body.floorCount),
      price,
      pricePerM2: toDecimal(body.price_per_m2 ?? body.pricePerM2) ?? (numericArea && price ? price / numericArea : undefined),
      currency: cleanCurrency(body.currency),
      isCredit: toBool(body.is_credit ?? body.isCredit),
      ownerType: cleanOwnerType(body.owner_type ?? body.ownerType),
      hasDocument: toBool(body.has_document ?? body.hasDocument),
      creditDownPayment: toDecimal(body.credit_down_payment ?? body.creditDownPayment),
      creditMonthlyPayment: toDecimal(body.credit_monthly_payment ?? body.creditMonthlyPayment),
      creditYears: toInt(body.credit_years ?? body.creditYears),
      imageUrl: cleanString(body.image_url ?? body.imageUrl),
      description: cleanString(body.description),
      displayOrder: toInt(body.display_order ?? body.displayOrder),
      userId: toInt(body.user_id ?? body.userId),
      status: cleanStatus(body.status),
      featured: toBool(body.featured),
      vip: toBool(body.vip),
    };
  },
  vacancy: (body) => ({
    title: cleanString(body.title),
    employmentType: cleanString(body.employment_type ?? body.employmentType),
    salary: cleanString(body.salary),
    city: cleanString(body.city),
    description: cleanString(body.description),
    isActive: toBool(body.is_active ?? body.isActive),
    slug: cleanString(body.slug),
  }),
  application: (body) => ({
    fullname: cleanString(body.fullname),
    phone: cleanString(body.phone),
    vacancyId: toInt(body.vacancy_id ?? body.vacancyId),
    cvFile: cleanString(body.cv_file ?? body.cvFile),
  }),
};

function compact(data) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function crudRouter({ router, prisma, model, serializer, publicRead = true, publicCreate = false, include }) {
  const readGuard = publicRead ? [] : [authenticate];
  const writeGuard = publicCreate ? [] : [authenticate, authorize('admin')];

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
