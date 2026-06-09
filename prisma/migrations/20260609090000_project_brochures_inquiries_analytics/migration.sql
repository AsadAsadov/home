ALTER TABLE public."projects"
  ADD COLUMN IF NOT EXISTS "pdf_url" TEXT,
  ADD COLUMN IF NOT EXISTS "pdf_filename" TEXT,
  ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "click_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "inquiry_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public."project_inquiries" (
  "id" SERIAL PRIMARY KEY,
  "project_id" INTEGER NOT NULL REFERENCES public."projects"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_project_inquiries_project_id" ON public."project_inquiries"("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_inquiries_status_created" ON public."project_inquiries"("status", "created_at");
