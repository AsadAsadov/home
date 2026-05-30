CREATE TABLE IF NOT EXISTS "hero_sections" (
    "id" SERIAL PRIMARY KEY,
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

UPDATE "hero_sections"
SET "page_key" = 'sea-breeze'
WHERE "page_key" IS NULL OR trim("page_key") = '';

DELETE FROM "hero_sections" a
USING "hero_sections" b
WHERE a."page_key" = b."page_key"
  AND a."id" > b."id";

ALTER TABLE "hero_sections"
ALTER COLUMN "page_key" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "hero_sections_page_key_key" ON "hero_sections"("page_key");
