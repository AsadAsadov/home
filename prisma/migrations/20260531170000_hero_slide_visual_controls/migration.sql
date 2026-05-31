ALTER TABLE "hero_slides"
ADD COLUMN IF NOT EXISTS "slide_type" TEXT NOT NULL DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS "project_id" INTEGER,
ADD COLUMN IF NOT EXISTS "media_source" TEXT NOT NULL DEFAULT 'upload',
ADD COLUMN IF NOT EXISTS "badge_text" TEXT,
ADD COLUMN IF NOT EXISTS "badge_color" TEXT DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS "badge_background" TEXT DEFAULT 'rgba(127,127,255,0.92)',
ADD COLUMN IF NOT EXISTS "title_color" TEXT DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS "title_font_size" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN IF NOT EXISTS "description_color" TEXT DEFAULT '#F8FAFC',
ADD COLUMN IF NOT EXISTS "description_font_size" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN IF NOT EXISTS "button_background" TEXT DEFAULT '#7F7FFF',
ADD COLUMN IF NOT EXISTS "button_text_color" TEXT DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS "panel_background" TEXT DEFAULT '#111827',
ADD COLUMN IF NOT EXISTS "panel_blur" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN IF NOT EXISTS "panel_opacity" INTEGER NOT NULL DEFAULT 72,
ADD COLUMN IF NOT EXISTS "panel_position" TEXT NOT NULL DEFAULT 'bottom-center',
ADD COLUMN IF NOT EXISTS "hero_height_desktop" INTEGER NOT NULL DEFAULT 560,
ADD COLUMN IF NOT EXISTS "hero_height_tablet" INTEGER NOT NULL DEFAULT 420,
ADD COLUMN IF NOT EXISTS "hero_height_mobile" INTEGER NOT NULL DEFAULT 320;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'hero_slides_project_id_fkey'
    ) THEN
        ALTER TABLE "hero_slides"
        ADD CONSTRAINT "hero_slides_project_id_fkey"
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_hero_slides_slide_type_project" ON "hero_slides"("slide_type", "project_id");
