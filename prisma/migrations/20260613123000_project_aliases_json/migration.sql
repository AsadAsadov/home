ALTER TABLE "projects"
ALTER COLUMN "aliases" TYPE JSONB
USING CASE
  WHEN "aliases" IS NULL THEN NULL
  ELSE to_jsonb("aliases")
END;
