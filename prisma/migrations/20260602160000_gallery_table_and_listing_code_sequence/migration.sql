DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'listing_code' AND data_type <> 'bigint'
  ) THEN
    ALTER TABLE "listings" ALTER COLUMN "listing_code" TYPE BIGINT USING "listing_code"::BIGINT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "listing_code_sequence" (
  "id" INTEGER PRIMARY KEY DEFAULT 1,
  "last_code" BIGINT NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "listing_code_sequence_singleton" CHECK ("id" = 1)
);

INSERT INTO "listing_code_sequence" ("id", "last_code")
VALUES (1, COALESCE((SELECT MAX("listing_code")::BIGINT FROM "listings"), 0))
ON CONFLICT ("id") DO UPDATE
SET "last_code" = GREATEST("listing_code_sequence"."last_code", EXCLUDED."last_code"),
    "updated_at" = now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MediaType')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type') THEN
    CREATE TYPE "MediaType" AS ENUM ('image', 'video');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "gallery" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "media_type" "MediaType" NOT NULL DEFAULT 'image',
  "image_url" TEXT,
  "video_url" TEXT,
  "thumbnail_url" TEXT,
  "media_urls" JSONB,
  "images" JSONB,
  "media_position_x" TEXT NOT NULL DEFAULT 'center',
  "media_position_y" TEXT NOT NULL DEFAULT 'center',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "media_type" "MediaType" NOT NULL DEFAULT 'image';
ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "video_url" TEXT;
ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT;
ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "media_urls" JSONB;
ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "images" JSONB;
ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "media_position_x" TEXT NOT NULL DEFAULT 'center';
ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "media_position_y" TEXT NOT NULL DEFAULT 'center';
ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "gallery_sort_order_id_idx" ON "gallery"("sort_order", "id");
CREATE INDEX IF NOT EXISTS "gallery_media_type_idx" ON "gallery"("media_type");
