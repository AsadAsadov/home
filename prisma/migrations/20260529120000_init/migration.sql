CREATE TYPE "Role" AS ENUM ('admin', 'user', 'employee');
CREATE TYPE "MediaType" AS ENUM ('image', 'video');

CREATE TABLE "users" (
    "id" SERIAL PRIMARY KEY,
    "fullname" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "employees" (
    "id" SERIAL PRIMARY KEY,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'employee',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "projects" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "delivery_date" TEXT,
    "floor_count" TEXT,
    "area" TEXT,
    "apartment_count" TEXT,
    "repair_status" TEXT,
    "features" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "listings" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "listing_type" TEXT,
    "property_category" TEXT,
    "project_name" TEXT,
    "room_count" INTEGER,
    "area" DECIMAL(12,2),
    "floor_count" TEXT,
    "price" DECIMAL(14,2),
    "price_per_m2" DECIMAL(12,2),
    "image_url" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "vacancies" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "employment_type" TEXT,
    "salary" TEXT,
    "city" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "applications" (
    "id" SERIAL PRIMARY KEY,
    "fullname" TEXT NOT NULL,
    "phone" TEXT,
    "vacancy_id" INTEGER REFERENCES "vacancies"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "cv_file" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "gallery" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "media_type" "MediaType" NOT NULL,
    "image_url" TEXT,
    "video_url" TEXT,
    "thumbnail_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "listings_project_name_idx" ON "listings"("project_name");
CREATE INDEX "listings_listing_type_idx" ON "listings"("listing_type");
CREATE INDEX "gallery_media_type_idx" ON "gallery"("media_type");
CREATE INDEX "applications_vacancy_id_idx" ON "applications"("vacancy_id");
