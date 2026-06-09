-- Track real user session activity for online/offline presence.

ALTER TABLE "user_sessions"
  ADD COLUMN IF NOT EXISTS "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "idx_user_sessions_last_active_at" ON "user_sessions"("last_active_at");
