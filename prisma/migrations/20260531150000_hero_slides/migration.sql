CREATE TABLE IF NOT EXISTS "hero_slides" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "media_type" TEXT NOT NULL DEFAULT 'image',
    "media_url" TEXT NOT NULL,
    "button_text" TEXT,
    "button_link" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "slide_duration" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_hero_slides_active_order" ON "hero_slides"("is_active", "display_order", "id");
