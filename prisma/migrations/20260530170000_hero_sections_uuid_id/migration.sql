CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "hero_sections" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "page_key" TEXT NOT NULL,
    "badge_text" TEXT,
    "title" TEXT,
    "description" TEXT,
    "hero_image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE "hero_sections"
ADD COLUMN IF NOT EXISTS "page_key" TEXT,
ADD COLUMN IF NOT EXISTS "badge_text" TEXT,
ADD COLUMN IF NOT EXISTS "title" TEXT,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "hero_image_url" TEXT,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

DO $$
DECLARE
  id_data_type text;
  id_udt_name text;
  pk_name text;
BEGIN
  SELECT data_type, udt_name
  INTO id_data_type, id_udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'hero_sections'
    AND column_name = 'id';

  IF id_udt_name IS NULL THEN
    ALTER TABLE "hero_sections" ADD COLUMN "id" UUID DEFAULT gen_random_uuid();
  ELSIF id_udt_name <> 'uuid' THEN
    ALTER TABLE "hero_sections" ADD COLUMN IF NOT EXISTS "id_uuid" UUID DEFAULT gen_random_uuid();
    UPDATE "hero_sections" SET "id_uuid" = gen_random_uuid() WHERE "id_uuid" IS NULL;
    ALTER TABLE "hero_sections" ALTER COLUMN "id_uuid" SET NOT NULL;

    SELECT tc.constraint_name
    INTO pk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
     AND tc.table_name = kcu.table_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'hero_sections'
      AND tc.constraint_type = 'PRIMARY KEY'
      AND kcu.column_name = 'id'
    LIMIT 1;

    IF pk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE "hero_sections" DROP CONSTRAINT %I', pk_name);
    END IF;

    ALTER TABLE "hero_sections" DROP COLUMN "id";
    ALTER TABLE "hero_sections" RENAME COLUMN "id_uuid" TO "id";
  END IF;

  ALTER TABLE "hero_sections" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  UPDATE "hero_sections" SET "id" = gen_random_uuid() WHERE "id" IS NULL;
  ALTER TABLE "hero_sections" ALTER COLUMN "id" SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'hero_sections'
      AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE "hero_sections" ADD CONSTRAINT "hero_sections_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

UPDATE "hero_sections"
SET "page_key" = 'sea-breeze'
WHERE "page_key" IS NULL OR trim("page_key") = '';

DELETE FROM "hero_sections" a
USING "hero_sections" b
WHERE a."page_key" = b."page_key"
  AND a.ctid > b.ctid;

ALTER TABLE "hero_sections"
ALTER COLUMN "page_key" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "hero_sections_page_key_key" ON "hero_sections"("page_key");
