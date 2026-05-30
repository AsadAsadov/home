CREATE TABLE IF NOT EXISTS "listing_images" (
    "id" SERIAL NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "listing_images_listing_id_sort_order_idx" ON "listing_images"("listing_id", "sort_order");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listing_images_listing_id_fkey'
    ) THEN
        ALTER TABLE "listing_images"
        ADD CONSTRAINT "listing_images_listing_id_fkey"
        FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
