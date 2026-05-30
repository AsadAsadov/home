ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS "approved_by" BIGINT NULL,
  ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "favorites_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "vip" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "idx_listings_status" ON "listings" ("status");

CREATE TABLE IF NOT EXISTS "listing_views" (
  "id" BIGSERIAL PRIMARY KEY,
  "listing_id" BIGINT NOT NULL,
  "user_id" BIGINT NULL,
  "viewed_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ip_address" TEXT NULL,
  "user_agent" TEXT NULL,
  CONSTRAINT "listing_views_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_listing_views_listing_id" ON "listing_views" ("listing_id");
CREATE INDEX IF NOT EXISTS "idx_listing_views_viewed_at" ON "listing_views" ("viewed_at");

CREATE TABLE IF NOT EXISTS "favorites" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NOT NULL,
  "listing_id" BIGINT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "favorites_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "favorites_user_id_listing_id_key" UNIQUE ("user_id", "listing_id")
);

CREATE INDEX IF NOT EXISTS "idx_favorites_user_id" ON "favorites" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_favorites_listing_id" ON "favorites" ("listing_id");
