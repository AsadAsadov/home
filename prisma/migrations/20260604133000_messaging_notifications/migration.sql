-- Messaging and notification tables for Supabase/PostgreSQL.
-- This migration is intentionally idempotent so it can also be pasted into
-- the Supabase SQL Editor for environments that missed the Prisma migration.

CREATE TABLE IF NOT EXISTS public."notifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "type" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "link" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES public."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public."conversations" (
  "id" BIGSERIAL PRIMARY KEY,
  "listing_id" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversations_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES public."listings"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public."participants" (
  "id" BIGSERIAL PRIMARY KEY,
  "conversation_id" BIGINT NOT NULL,
  "user_id" INTEGER NOT NULL,
  CONSTRAINT "participants_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES public."conversations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "participants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES public."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public."messages" (
  "id" BIGSERIAL PRIMARY KEY,
  "conversation_id" BIGINT NOT NULL,
  "sender_id" INTEGER NOT NULL,
  "receiver_id" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "delivered_at" TIMESTAMP(3),
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES public."conversations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES public."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "messages_receiver_id_fkey"
    FOREIGN KEY ("receiver_id") REFERENCES public."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON public."notifications"("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON public."notifications"("created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON public."notifications"("is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_read_created" ON public."notifications"("user_id", "is_read", "created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON public."notifications"("type");

CREATE INDEX IF NOT EXISTS "idx_conversations_listing_id" ON public."conversations"("listing_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_created_at" ON public."conversations"("created_at");
CREATE INDEX IF NOT EXISTS "idx_conversations_updated_at" ON public."conversations"("updated_at");

CREATE UNIQUE INDEX IF NOT EXISTS "participants_conversation_user_unique" ON public."participants"("conversation_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_participants_conversation_id" ON public."participants"("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_participants_user_id" ON public."participants"("user_id");

CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id" ON public."messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_messages_created_at" ON public."messages"("created_at");
CREATE INDEX IF NOT EXISTS "idx_messages_is_read" ON public."messages"("is_read");
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_created" ON public."messages"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_messages_receiver_read" ON public."messages"("receiver_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_messages_sender_id" ON public."messages"("sender_id");
