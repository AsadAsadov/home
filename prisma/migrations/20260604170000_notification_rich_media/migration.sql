ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "video_url" TEXT;
