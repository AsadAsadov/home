ALTER TABLE "vacancies"
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;

ALTER TABLE "projects"
ADD COLUMN IF NOT EXISTS "images" JSONB;

UPDATE "users" SET "role" = 'user' WHERE "role" = 'employee';

DROP TABLE IF EXISTS "employees";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'employee' AND enumtypid = 'Role'::regtype) THEN
      CREATE TYPE "Role_new" AS ENUM ('admin', 'user');
      ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
      ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
      ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
      DROP TYPE "Role";
      ALTER TYPE "Role_new" RENAME TO "Role";
    END IF;
  END IF;
END $$;
