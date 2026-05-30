ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "display_order" INTEGER;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "display_order" INTEGER;

UPDATE "projects"
SET "display_order" = "id"
WHERE "display_order" IS NULL;

UPDATE "listings"
SET "display_order" = "id"
WHERE "display_order" IS NULL;

CREATE INDEX IF NOT EXISTS "projects_display_order_id_idx" ON "projects"("display_order", "id");
CREATE INDEX IF NOT EXISTS "listings_display_order_id_idx" ON "listings"("display_order", "id");

CREATE OR REPLACE FUNCTION set_display_order_to_id()
RETURNS trigger AS $$
BEGIN
  IF NEW."display_order" IS NULL THEN
    NEW."display_order" := NEW."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "projects_display_order_default" ON "projects";
CREATE TRIGGER "projects_display_order_default"
BEFORE INSERT ON "projects"
FOR EACH ROW
EXECUTE FUNCTION set_display_order_to_id();

DROP TRIGGER IF EXISTS "listings_display_order_default" ON "listings";
CREATE TRIGGER "listings_display_order_default"
BEFORE INSERT ON "listings"
FOR EACH ROW
EXECUTE FUNCTION set_display_order_to_id();
