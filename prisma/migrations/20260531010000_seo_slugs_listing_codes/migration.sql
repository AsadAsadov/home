-- SEO slugs and public listing codes. Existing production databases may already
-- contain projects.slug and listings.listing_code, so each change is guarded.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "vacancies" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "listing_code" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "projects_slug_key" ON "projects"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "vacancies_slug_key" ON "vacancies"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "listings_listing_code_key" ON "listings"("listing_code");


-- Backfill existing rows without depending on application startup.
WITH numbered AS (
  SELECT id, 999 + ROW_NUMBER() OVER (ORDER BY id) AS code
  FROM "listings"
  WHERE "listing_code" IS NULL
)
UPDATE "listings" l
SET "listing_code" = numbered.code
FROM numbered
WHERE l.id = numbered.id;
