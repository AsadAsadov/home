-- The application authenticates against the Prisma User model mapped to public.users.
-- Keep OAuth/local auth metadata on that same application table.
ALTER TABLE public."users"
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "phone_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "last_login" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_login_ip" TEXT,
  ADD COLUMN IF NOT EXISTS "last_login_user_agent" TEXT,
  ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public."users"
  ALTER COLUMN "password_hash" DROP NOT NULL;
