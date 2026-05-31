ALTER TABLE "projects"
ADD COLUMN IF NOT EXISTS "featured_in_hero" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "idx_projects_featured_hero_order"
ON "projects"("featured_in_hero", "display_order", "id");
