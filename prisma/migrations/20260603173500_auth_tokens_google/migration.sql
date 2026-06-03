ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" VARCHAR NOT NULL DEFAULT 'local';
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_user_id" ON "email_verification_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_expires_at" ON "email_verification_tokens"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_used" ON "email_verification_tokens"("used");

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_user_id" ON "password_reset_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_expires_at" ON "password_reset_tokens"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_used" ON "password_reset_tokens"("used");
