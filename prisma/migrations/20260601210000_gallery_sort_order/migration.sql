ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

UPDATE "gallery"
SET "sort_order" = ranked.row_number
FROM (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "created_at" DESC, "id" DESC) AS row_number
  FROM "gallery"
) AS ranked
WHERE "gallery"."id" = ranked."id" AND "gallery"."sort_order" = 0;

CREATE INDEX IF NOT EXISTS "gallery_sort_order_id_idx" ON "gallery"("sort_order", "id");
