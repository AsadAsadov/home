ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_by_id" INTEGER;

ALTER TABLE "participants"
  ADD COLUMN IF NOT EXISTS "hidden_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cleared_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "idx_messages_deleted_at" ON "messages"("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_participants_hidden_at" ON "participants"("hidden_at");
CREATE INDEX IF NOT EXISTS "idx_participants_cleared_at" ON "participants"("cleared_at");
