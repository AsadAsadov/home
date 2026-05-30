-- Align Prisma-managed migrations with the real Supabase listings schema.
-- Real Supabase: listings.id/listing_images.id/listing_images.listing_id/user_id are bigint,
-- and listings.area is text. Drop dependent FKs before type changes, then recreate
-- only the listing_images -> listings FK used by the application.
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.listing_images'::regclass
    AND contype = 'f'
    AND pg_get_constraintdef(oid) LIKE '%REFERENCES listings%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "listing_images" DROP CONSTRAINT %I', constraint_name);
  END IF;

  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.listings'::regclass
    AND contype = 'f'
    AND pg_get_constraintdef(oid) LIKE '%REFERENCES users%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "listings" DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE "listings" ALTER COLUMN "id" TYPE BIGINT;
ALTER TABLE "listings" ALTER COLUMN "area" TYPE TEXT USING "area"::TEXT;
ALTER TABLE "listings" ALTER COLUMN "user_id" TYPE BIGINT;

ALTER TABLE "listing_images" ALTER COLUMN "id" TYPE BIGINT;
ALTER TABLE "listing_images" ALTER COLUMN "listing_id" TYPE BIGINT;

DROP SEQUENCE IF EXISTS "listings_id_seq" CASCADE;
CREATE SEQUENCE IF NOT EXISTS "listings_id_seq" AS BIGINT OWNED BY "listings"."id";
SELECT setval('"listings_id_seq"', COALESCE((SELECT MAX("id") FROM "listings"), 0) + 1, false);
ALTER TABLE "listings" ALTER COLUMN "id" SET DEFAULT nextval('"listings_id_seq"');

DROP SEQUENCE IF EXISTS "listing_images_id_seq" CASCADE;
CREATE SEQUENCE IF NOT EXISTS "listing_images_id_seq" AS BIGINT OWNED BY "listing_images"."id";
SELECT setval('"listing_images_id_seq"', COALESCE((SELECT MAX("id") FROM "listing_images"), 0) + 1, false);
ALTER TABLE "listing_images" ALTER COLUMN "id" SET DEFAULT nextval('"listing_images_id_seq"');

ALTER TABLE "listing_images"
ADD CONSTRAINT "listing_images_listing_id_fkey"
FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
