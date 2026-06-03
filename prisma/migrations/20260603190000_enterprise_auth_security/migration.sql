-- Enterprise auth security polish: login lockout, email change verification, session activity, and richer audit logs.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "last_login_ip" TEXT,
  ADD COLUMN IF NOT EXISTS "last_login_user_agent" TEXT,
  ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "idx_users_locked_until" ON "users"("locked_until");

CREATE TABLE IF NOT EXISTS "email_change_tokens" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "token" TEXT NOT NULL,
  "new_email" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_change_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_change_tokens_token_key" ON "email_change_tokens"("token");
CREATE INDEX IF NOT EXISTS "idx_email_change_tokens_user_id" ON "email_change_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_change_tokens_new_email" ON "email_change_tokens"("new_email");
CREATE INDEX IF NOT EXISTS "idx_email_change_tokens_expires_at" ON "email_change_tokens"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_email_change_tokens_used" ON "email_change_tokens"("used");

ALTER TABLE "user_sessions"
  ADD COLUMN IF NOT EXISTS "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "user_activity_logs"
  ADD COLUMN IF NOT EXISTS "ip_address" TEXT,
  ADD COLUMN IF NOT EXISTS "user_agent" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;
