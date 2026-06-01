ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "title_az" TEXT,
  ADD COLUMN IF NOT EXISTS "title_en" TEXT,
  ADD COLUMN IF NOT EXISTS "title_ru" TEXT,
  ADD COLUMN IF NOT EXISTS "title_tr" TEXT,
  ADD COLUMN IF NOT EXISTS "description_az" TEXT,
  ADD COLUMN IF NOT EXISTS "description_en" TEXT,
  ADD COLUMN IF NOT EXISTS "description_ru" TEXT,
  ADD COLUMN IF NOT EXISTS "description_tr" TEXT,
  ADD COLUMN IF NOT EXISTS "features_az" TEXT,
  ADD COLUMN IF NOT EXISTS "features_en" TEXT,
  ADD COLUMN IF NOT EXISTS "features_ru" TEXT,
  ADD COLUMN IF NOT EXISTS "features_tr" TEXT;

UPDATE "projects" SET "title_az" = COALESCE("title_az", "title"), "description_az" = COALESCE("description_az", "description"), "features_az" = COALESCE("features_az", "features");

ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "title_az" TEXT,
  ADD COLUMN IF NOT EXISTS "title_en" TEXT,
  ADD COLUMN IF NOT EXISTS "title_ru" TEXT,
  ADD COLUMN IF NOT EXISTS "title_tr" TEXT,
  ADD COLUMN IF NOT EXISTS "description_az" TEXT,
  ADD COLUMN IF NOT EXISTS "description_en" TEXT,
  ADD COLUMN IF NOT EXISTS "description_ru" TEXT,
  ADD COLUMN IF NOT EXISTS "description_tr" TEXT,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'AZN',
  ADD COLUMN IF NOT EXISTS "is_credit" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "credit_down_payment" NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS "credit_monthly_payment" NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS "credit_years" INTEGER;

UPDATE "listings" SET "title_az" = COALESCE("title_az", "title"), "description_az" = COALESCE("description_az", "description"), "currency" = COALESCE(NULLIF("currency", ''), 'AZN');

ALTER TABLE "vacancies"
  ADD COLUMN IF NOT EXISTS "title_az" TEXT,
  ADD COLUMN IF NOT EXISTS "title_en" TEXT,
  ADD COLUMN IF NOT EXISTS "title_ru" TEXT,
  ADD COLUMN IF NOT EXISTS "title_tr" TEXT,
  ADD COLUMN IF NOT EXISTS "description_az" TEXT,
  ADD COLUMN IF NOT EXISTS "description_en" TEXT,
  ADD COLUMN IF NOT EXISTS "description_ru" TEXT,
  ADD COLUMN IF NOT EXISTS "description_tr" TEXT;

UPDATE "vacancies" SET "title_az" = COALESCE("title_az", "title"), "description_az" = COALESCE("description_az", "description");

ALTER TABLE "hero_slides"
  ADD COLUMN IF NOT EXISTS "title_az" TEXT,
  ADD COLUMN IF NOT EXISTS "title_en" TEXT,
  ADD COLUMN IF NOT EXISTS "title_ru" TEXT,
  ADD COLUMN IF NOT EXISTS "title_tr" TEXT,
  ADD COLUMN IF NOT EXISTS "description_az" TEXT,
  ADD COLUMN IF NOT EXISTS "description_en" TEXT,
  ADD COLUMN IF NOT EXISTS "description_ru" TEXT,
  ADD COLUMN IF NOT EXISTS "description_tr" TEXT,
  ADD COLUMN IF NOT EXISTS "button_text_az" TEXT,
  ADD COLUMN IF NOT EXISTS "button_text_en" TEXT,
  ADD COLUMN IF NOT EXISTS "button_text_ru" TEXT,
  ADD COLUMN IF NOT EXISTS "button_text_tr" TEXT;

UPDATE "hero_slides" SET "title_az" = COALESCE("title_az", "title"), "description_az" = COALESCE("description_az", "description"), "button_text_az" = COALESCE("button_text_az", "button_text");
