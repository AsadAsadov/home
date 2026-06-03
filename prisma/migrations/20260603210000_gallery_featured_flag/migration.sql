ALTER TABLE "gallery"
ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "idx_gallery_featured_videos"
ON "gallery"("media_type", "is_featured", "sort_order", "id");

UPDATE "gallery"
SET "is_featured" = true
WHERE "media_type" = 'video'
  AND "is_featured" = false
  AND (
    LOWER(COALESCE("title", '')) LIKE '%prezident%'
    OR LOWER(COALESCE("title", '')) LIKE '%president%'
    OR LOWER(COALESCE("title", '')) LIKE '%çıxış%'
  );
