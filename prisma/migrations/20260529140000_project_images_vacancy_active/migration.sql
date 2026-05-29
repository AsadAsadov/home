ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "images" JSONB;
ALTER TABLE "vacancies" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "vacancies_is_active_idx" ON "vacancies"("is_active");
CREATE INDEX IF NOT EXISTS "projects_title_idx" ON "projects"("title");
