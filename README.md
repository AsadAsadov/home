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
npx prisma migrate deploy
npm run db:seed
npm start
```

Open `http://localhost:3000`. The server serves the existing `index.html` and all REST APIs from the same origin.

Default seeded logins:

- Admin: `admin@besthome.az` / `Admin12345` (override with `ADMIN_PASSWORD` before seeding)
- Employee: `elnur@besthome.az` / `agent123`

## Supabase

Paste Supabase PostgreSQL URI values into `.env`:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public&pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"
```

Run migrations with `npx prisma migrate deploy`.

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

- `DATABASE_URL`
- `DIRECT_URL`
- `CORS_ORIGIN` (for example `https://besthome.az,https://www.besthome.az`)
- `JWT_SECRET` (Render can generate it)

The build command runs Prisma generation and migration deployment automatically.
