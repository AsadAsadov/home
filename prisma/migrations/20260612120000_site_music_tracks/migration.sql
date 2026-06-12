CREATE TABLE IF NOT EXISTS public."site_music_tracks" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "audio_url" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_site_music_tracks_active_order" ON public."site_music_tracks"("is_active", "sort_order", "id");
CREATE INDEX IF NOT EXISTS "idx_site_music_tracks_sort_created" ON public."site_music_tracks"("sort_order", "created_at");
