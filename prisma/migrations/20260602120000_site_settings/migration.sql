CREATE TABLE IF NOT EXISTS "site_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "show_baki" BOOLEAN NOT NULL DEFAULT true,
    "show_sumqayit" BOOLEAN NOT NULL DEFAULT true,
    "show_absheron" BOOLEAN NOT NULL DEFAULT true,
    "show_metro_filter" BOOLEAN NOT NULL DEFAULT true,
    "show_rayon_filter" BOOLEAN NOT NULL DEFAULT true,
    "show_qesebe_filter" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "site_settings" ("id") VALUES (1)
ON CONFLICT ("id") DO NOTHING;
