CREATE TABLE IF NOT EXISTS "seabreeze_hero_slides" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "media_type" TEXT NOT NULL DEFAULT 'image',
  "image_url" TEXT,
  "video_url" TEXT,
  "cta_text" TEXT,
  "cta_link" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_seabreeze_hero_slides_active_order" ON "seabreeze_hero_slides"("is_active", "sort_order", "id");
CREATE TABLE IF NOT EXISTS "seabreeze_sections" (
  "id" SERIAL PRIMARY KEY,
  "section_key" TEXT,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "image_url" TEXT,
  "video_url" TEXT,
  "facts" JSONB,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_seabreeze_sections_active_order" ON "seabreeze_sections"("is_active", "sort_order", "id");
CREATE TABLE IF NOT EXISTS "seabreeze_gallery" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT,
  "category" TEXT,
  "media_type" TEXT NOT NULL DEFAULT 'image',
  "media_url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_seabreeze_gallery_active_category_order" ON "seabreeze_gallery"("is_active", "category", "sort_order", "id");
