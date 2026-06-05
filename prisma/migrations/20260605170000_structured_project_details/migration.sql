ALTER TABLE "projects"
  ADD COLUMN "zone" TEXT,
  ADD COLUMN "coastline" TEXT,
  ADD COLUMN "sea_distance" TEXT,
  ADD COLUMN "building_count" TEXT,
  ADD COLUMN "parking_spaces" TEXT,
  ADD COLUMN "apartment_formats" TEXT,
  ADD COLUMN "apartment_areas" TEXT,
  ADD COLUMN "area_range" TEXT,
  ADD COLUMN "price_per_m2" TEXT,
  ADD COLUMN "total_price" TEXT,
  ADD COLUMN "bank_mortgage" TEXT,
  ADD COLUMN "internal_credit" TEXT,
  ADD COLUMN "down_payment" TEXT,
  ADD COLUMN "infrastructure" TEXT;

-- Preserve the old general area value as the new structured area range.
UPDATE "projects" SET "area_range" = "area" WHERE "area_range" IS NULL AND "area" IS NOT NULL;
