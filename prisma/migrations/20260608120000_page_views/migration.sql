CREATE TABLE IF NOT EXISTS "page_views" (
  "id" BIGSERIAL PRIMARY KEY,
  "path" TEXT NOT NULL,
  "full_url" TEXT,
  "referrer" TEXT,
  "user_agent" TEXT,
  "ip_hash" TEXT,
  "device_type" TEXT,
  "browser" TEXT,
  "os" TEXT,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_page_views_created_at" ON "page_views"("created_at");
CREATE INDEX IF NOT EXISTS "idx_page_views_path" ON "page_views"("path");
CREATE INDEX IF NOT EXISTS "idx_page_views_user_id" ON "page_views"("user_id");
CREATE INDEX IF NOT EXISTS "idx_page_views_ip_hash" ON "page_views"("ip_hash");
CREATE INDEX IF NOT EXISTS "idx_page_views_device_type" ON "page_views"("device_type");
