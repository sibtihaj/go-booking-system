# Deploy: Go API + Next.js + Supabase

## Supabase

1. Create a project; enable **Email** (or other) providers under Authentication.
2. **Site URL**: your Next.js origin (e.g. `http://localhost:3000` in dev, production URL later).
3. **Redirect URLs**: include `{NEXT_ORIGIN}/auth/callback`.
4. Apply migrations from [`db/migrations`](db/migrations) (already applied if you used Supabase MCP, or run in SQL editor).
5. Optional demo slots: run [`db/seeds/demo.sql`](db/seeds/demo.sql) in the SQL editor.
6. **Secrets**: `anon` / publishable key go to the browser (`NEXT_PUBLIC_*`). **Service role** and **database password** stay server-side only (Go `DATABASE_URL`).

## Go API (Railway or similar)

1. Create a service from this repo; set **root directory** to `apps/api` (or build from [`apps/api/Dockerfile`](apps/api/Dockerfile)).
2. Set environment from [`apps/api/.env.example`](apps/api/.env.example): `DATABASE_URL`, `SUPABASE_URL`, `CORS_ALLOWED_ORIGINS` (your deployed Next origin only).
3. Railway sets `PORT` as a number; the app accepts `8080` or `:8080`. If the platform injects `8080` without a colon, the server listens on `:8080`.

## Next.js (Vercel or Railway)

1. Create app with **root directory** `apps/web`.
2. Set env from [`apps/web/.env.example`](apps/web/.env.example): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` (public Go base URL), `NEXT_PUBLIC_DEFAULT_RESOURCE_ID` if not using the demo UUID.

## Local development

Terminal 1 — API (requires `.env` in `apps/api` or exported vars):

```bash
cd apps/api && go run -buildvcs=false ./cmd/server
```

Terminal 2 — web:

```bash
cd apps/web && cp .env.example .env.local  # then edit values
npm run dev
```

Ensure Go **CORS** includes `http://localhost:3000`.
