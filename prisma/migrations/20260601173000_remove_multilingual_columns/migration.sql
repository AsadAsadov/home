ALTER TABLE "projects"
  DROP COLUMN IF EXISTS "title_az",
  DROP COLUMN IF EXISTS "title_en",
  DROP COLUMN IF EXISTS "title_ru",
  DROP COLUMN IF EXISTS "title_tr",
  DROP COLUMN IF EXISTS "description_az",
  DROP COLUMN IF EXISTS "description_en",
  DROP COLUMN IF EXISTS "description_ru",
  DROP COLUMN IF EXISTS "description_tr",
  DROP COLUMN IF EXISTS "features_az",
  DROP COLUMN IF EXISTS "features_en",
  DROP COLUMN IF EXISTS "features_ru",
  DROP COLUMN IF EXISTS "features_tr";

ALTER TABLE "listings"
  DROP COLUMN IF EXISTS "title_az",
  DROP COLUMN IF EXISTS "title_en",
  DROP COLUMN IF EXISTS "title_ru",
  DROP COLUMN IF EXISTS "title_tr",
  DROP COLUMN IF EXISTS "description_az",
  DROP COLUMN IF EXISTS "description_en",
  DROP COLUMN IF EXISTS "description_ru",
  DROP COLUMN IF EXISTS "description_tr";

ALTER TABLE "vacancies"
  DROP COLUMN IF EXISTS "title_az",
  DROP COLUMN IF EXISTS "title_en",
  DROP COLUMN IF EXISTS "title_ru",
  DROP COLUMN IF EXISTS "title_tr",
  DROP COLUMN IF EXISTS "description_az",
  DROP COLUMN IF EXISTS "description_en",
  DROP COLUMN IF EXISTS "description_ru",
  DROP COLUMN IF EXISTS "description_tr";

ALTER TABLE "hero_slides"
  DROP COLUMN IF EXISTS "title_az",
  DROP COLUMN IF EXISTS "title_en",
  DROP COLUMN IF EXISTS "title_ru",
  DROP COLUMN IF EXISTS "title_tr",
  DROP COLUMN IF EXISTS "description_az",
  DROP COLUMN IF EXISTS "description_en",
  DROP COLUMN IF EXISTS "description_ru",
  DROP COLUMN IF EXISTS "description_tr",
  DROP COLUMN IF EXISTS "button_text_az",
  DROP COLUMN IF EXISTS "button_text_en",
  DROP COLUMN IF EXISTS "button_text_ru",
  DROP COLUMN IF EXISTS "button_text_tr";
