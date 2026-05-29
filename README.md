# BestHome.az Backend

Production-ready Express + Prisma backend for the existing BestHome.az single-page frontend.

## Stack

- Node.js + Express.js
- PostgreSQL via Supabase
- Prisma ORM
- JWT authentication (`admin`, `user`, `employee`)
- Multer file uploads (`/uploads`)

## Local setup

```bash
cp .env.example .env
npm install
npx prisma generate
# Production migrations are applied manually; do not run migrate deploy in Render builds.
npm run db:seed
npm start
```

Open `http://localhost:3000`. The server serves the existing `index.html` and all REST APIs from the same origin.

Default seeded logins:

- Admin: `admin@besthome.az` / `Admin12345` (override with `ADMIN_PASSWORD` before seeding)
- Employee: `elnur@besthome.az` / `agent123`

## Supabase

Paste the Supabase Transaction Pooler URI into `.env`. Prisma must use the pooler with PgBouncer mode and a single connection to avoid prepared statement conflicts:

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

Do not configure `DIRECT_URL` and do not use the direct TCP database host for production. Apply migrations manually in Supabase SQL Editor or from a controlled migration environment, not from the Render build command.

Manual gallery compatibility migration:

```sql
ALTER TABLE "gallery"
ADD COLUMN IF NOT EXISTS "images" JSONB;
```

## REST API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- CRUD: `/api/projects`
- CRUD: `/api/listings`
- CRUD: `/api/vacancies`
- CRUD: `/api/gallery`
- CRUD: `/api/applications`
- CRUD: `/api/users`
- CRUD: `/api/employees`
- Upload: `POST /api/uploads` with multipart field `file`
- Gallery uploads: `POST /api/gallery` / `PUT /api/gallery/:id` support multipart fields repeated `images`, `image`, and `video`, plus YouTube, Vimeo, and MP4 URLs
- Frontend DB bootstrap/sync: `/api/sync`

Write operations require `Authorization: Bearer <JWT>` unless the endpoint is a public CV application submission.

## Render deployment

`render.yaml` is included. Set these Render environment variables:

- `DATABASE_URL` (Supabase Transaction Pooler URL with `?pgbouncer=true&connection_limit=1`)
- `CORS_ORIGIN` (for example `https://besthome.az,https://www.besthome.az`)
- `JWT_SECRET` (Render can generate it)

The build command runs `npm install && npx prisma generate` only. Run database migrations manually before or during deployment.
