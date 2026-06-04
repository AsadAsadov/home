CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "type" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "link" TEXT,
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" BIGSERIAL PRIMARY KEY,
  "listing_id" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "participants" (
  "id" BIGSERIAL PRIMARY KEY,
  "conversation_id" BIGINT NOT NULL,
  "user_id" INTEGER NOT NULL,
  CONSTRAINT "participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" BIGSERIAL PRIMARY KEY,
  "conversation_id" BIGINT NOT NULL,
  "sender_id" INTEGER NOT NULL,
  "receiver_id" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "delivered_at" TIMESTAMP(3),
  "read_at" TIMESTAMP(3),
  CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_read_created" ON "notifications"("user_id", "is_read", "created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "notifications"("type");
CREATE INDEX IF NOT EXISTS "idx_conversations_listing_id" ON "conversations"("listing_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_updated_at" ON "conversations"("updated_at");
CREATE UNIQUE INDEX IF NOT EXISTS "participants_conversation_user_unique" ON "participants"("conversation_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_participants_user_id" ON "participants"("user_id");
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_created" ON "messages"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_messages_receiver_read" ON "messages"("receiver_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_messages_sender_id" ON "messages"("sender_id");
