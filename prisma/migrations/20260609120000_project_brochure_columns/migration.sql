ALTER TABLE public."projects"
  ADD COLUMN IF NOT EXISTS "brochure_url" TEXT,
  ADD COLUMN IF NOT EXISTS "brochure_filename" TEXT;
