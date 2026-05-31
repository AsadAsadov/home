ALTER TABLE "site_ads"
  ADD COLUMN IF NOT EXISTS "repeat_count" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "rotation_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "display_duration" INTEGER NOT NULL DEFAULT 30;

CREATE INDEX IF NOT EXISTS "idx_site_ads_rotation_order_created"
  ON "site_ads" ("rotation_order", "created_at");
