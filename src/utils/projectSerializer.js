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

function toFloat(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toCoordinate(value, min, max) {
  const parsed = toFloat(value);
  if (parsed === undefined) return undefined;
  return parsed >= min && parsed <= max ? parsed : undefined;
}

function toBool(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on', 'aktiv'].includes(String(value).toLowerCase());
}

function serializeProject(body) {
  const latitude = toCoordinate(body.latitude, -90, 90);
  const longitude = toCoordinate(body.longitude, -180, 180);
  const hasValidCoordinates = latitude !== undefined && longitude !== undefined;
  const verifiedInput = body.map_location_verified ?? body.mapLocationVerified;
  const mapLocationVerified = verifiedInput === undefined || verifiedInput === null || verifiedInput === ''
    ? (hasValidCoordinates ? true : undefined)
    : toBool(verifiedInput);

  return {
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
    pdfUrl: cleanString(body.pdf_url ?? body.pdfUrl),
    pdfFilename: cleanString(body.pdf_filename ?? body.pdfFilename),
    brochureUrl: cleanString(body.brochure_url ?? body.brochureUrl),
    brochureFilename: cleanString(body.brochure_filename ?? body.brochureFilename),
    aliases: cleanString(body.aliases),
    latitude,
    longitude,
    mapLocationVerified,
    mapLocationLabel: cleanString(body.map_location_label ?? body.mapLocationLabel),
  };
}

module.exports = { serializeProject };
