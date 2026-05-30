require('dotenv').config();
const prisma = require('../src/lib/prisma');
const { serializers, compact } = require('../src/routes/crud');

const auditQueries = {
  columns: `
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('listings', 'listing_images')
    ORDER BY table_name, ordinal_position`,
  triggers: `
    SELECT event_object_table AS table_name, trigger_name, action_timing, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema = 'public' AND event_object_table IN ('listings', 'listing_images')
    ORDER BY event_object_table, trigger_name`,
  functions: `
    SELECT n.nspname AS schema_name, p.proname AS function_name, pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND pg_get_functiondef(p.oid) ILIKE ANY (ARRAY['%listings%', '%listing_images%', '%display_order%'])
    ORDER BY p.proname`,
  rules: `
    SELECT schemaname, tablename, rulename, definition
    FROM pg_rules
    WHERE schemaname = 'public' AND tablename IN ('listings', 'listing_images')
    ORDER BY tablename, rulename`,
  constraints: `
    SELECT conrelid::regclass::text AS table_name, conname, contype, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conrelid IN ('public.listings'::regclass, 'public.listing_images'::regclass)
    ORDER BY table_name, conname`,
  generatedColumns: `
    SELECT table_name, column_name, generation_expression
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('listings', 'listing_images')
      AND generation_expression IS NOT NULL
    ORDER BY table_name, column_name`,
};

const sampleBody = {
  title: 'TEST',
  listing_type: 'Satis',
  property_category: 'Apartment',
  project_name: 'Audit Project',
  room_count: 2,
  area: '74',
  floor_number: 5,
  floor_count: '12',
  price: 245000,
  description: 'Audit insert',
  image_url: 'https://example.com/audit.jpg',
};

async function printDatabaseAudit() {
  for (const [label, query] of Object.entries(auditQueries)) {
    const rows = await prisma.$queryRawUnsafe(query);
    console.log(`\n=== ${label.toUpperCase()} ===`);
    console.dir(rows, { depth: null });
  }
}

async function incrementalCreateAudit() {
  const serialized = compact(serializers.listing(sampleBody));
  const steps = [
    ['title'],
    ['title', 'listingType'],
    ['title', 'listingType', 'propertyCategory'],
    ['title', 'listingType', 'propertyCategory', 'projectName'],
    ['title', 'listingType', 'propertyCategory', 'projectName', 'roomCount'],
    ['title', 'listingType', 'propertyCategory', 'projectName', 'roomCount', 'area'],
    ['title', 'listingType', 'propertyCategory', 'projectName', 'roomCount', 'area', 'floorNumber'],
    ['title', 'listingType', 'propertyCategory', 'projectName', 'roomCount', 'area', 'floorNumber', 'floorCount'],
    ['title', 'listingType', 'propertyCategory', 'projectName', 'roomCount', 'area', 'floorNumber', 'floorCount', 'price'],
    ['title', 'listingType', 'propertyCategory', 'projectName', 'roomCount', 'area', 'floorNumber', 'floorCount', 'price', 'pricePerM2'],
    ['title', 'listingType', 'propertyCategory', 'projectName', 'roomCount', 'area', 'floorNumber', 'floorCount', 'price', 'pricePerM2', 'description'],
    ['title', 'listingType', 'propertyCategory', 'projectName', 'roomCount', 'area', 'floorNumber', 'floorCount', 'price', 'pricePerM2', 'description', 'imageUrl'],
  ];

  console.log('\n=== INCREMENTAL CREATE AUDIT ===');
  for (const fields of steps) {
    const data = Object.fromEntries(fields.map((field) => [field, serialized[field]]).filter(([, value]) => value !== undefined));
    let created;
    try {
      created = await prisma.listing.create({ data });
      console.log('OK', fields.at(-1), data, { id: created.id });
    } catch (error) {
      console.error('FAILED WHEN ADDING FIELD', fields.at(-1));
      console.error({ data, message: error.message, code: error.code, meta: error.meta });
      throw error;
    } finally {
      if (created) await prisma.listing.delete({ where: { id: created.id } }).catch(() => {});
    }
  }
}

(async () => {
  await printDatabaseAudit();
  await incrementalCreateAudit();
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
