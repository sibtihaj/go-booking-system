# Deployment

This document describes how the booking system is put together in production-oriented environments. It is meant for anyone browsing the repository who wants to understand architecture and hosting choices rather than a copy-paste runbook.

## Supabase

The project uses Supabase for authentication and Postgres. Email (or other) sign-in is enabled in the Supabase dashboard as needed. The **site URL** matches the Next.js origin in each environment, and **redirect URLs** include the auth callback route so OAuth-style flows return to the app correctly.

Database shape lives in `[db/migrations](db/migrations)`. Optional demo data is in `[db/seeds/demo.sql](db/seeds/demo.sql)` for local or staging exploration. From a security standpoint, the **anon** (publishable) key is safe to expose to the browser and is wired through `NEXT_PUBLIC_*` variables. The **service role** key and **database password** are treated as server-only secrets: the Go API uses `DATABASE_URL` and related settings and never exposes them to the client.

## Go API

The API is a Go service under `[apps/api](apps/api)`, with a `[Dockerfile](apps/api/Dockerfile)` for container builds. Typical platforms (for example Railway) point the service at that directory as the build root. Configuration follows `[apps/api/.env.example](apps/api/.env.example)`: database URL, Supabase URL, and **CORS** origins restricted to the deployed web app. The server listens on the port the platform provides (`PORT`), defaulting to `8080` when unset, so it fits standard PaaS conventions.

## Next.js frontend

The web app lives in `[apps/web](apps/web)`. Deployments usually set the app root to `apps/web`. Environment variables mirror `[apps/web/.env.example](apps/web/.env.example)`: public Supabase URL and anon key, the public base URL of the Go API, and optional defaults such as `NEXT_PUBLIC_DEFAULT_RESOURCE_ID` when using the bundled demo resource id.

## Local development

For day-to-day work, the API and web app run as separate processes so each can be restarted independently. The API loads configuration from `apps/api` (`.env` or exported variables); the web app uses `.env.local` derived from its example file. Go **CORS** is set up so the browser origin for the Next dev server (typically `http://localhost:3000`) is allowed to call the API.

## Observability

The Go API serves Prometheus-formatted metrics at `**GET /metrics`**. The implementation records connection pool behaviour, standard Go runtime signals, reservation outcomes, benchmark runs, and HTTP request counts. Metrics can be turned off with `ENABLE_PROMETHEUS_METRICS=false` if a deployment should not expose them.

A small observability stack ships in the repo under `[observability/](observability/)`: Prometheus scrapes the API (in the bundled Compose setup, the API runs on the host and is reached at `host.docker.internal:8080`), and Grafana loads a provisioned **Go Booking API** dashboard. The Compose file is `[docker-compose.observability.yml](docker-compose.observability.yml)`. On a hosted API, the same metrics endpoint can be scraped by managed Prometheus or Grafana Cloud; in production it is worth restricting who can reach `/metrics` (network policy, authentication, or private scrape paths), since it exposes operational detail.

**Railway:** The sample config in `[observability/railway/prometheus/prometheus.yml](observability/railway/prometheus/prometheus.yml)` scrapes the Go API at **`your-service-name.railway.internal:8080`**. Prometheus uses `http` and defaults omitted ports to **80**, so the scrape target must include the same port the API listens on (Railway’s `PORT`, usually `8080`). If Grafana shows an empty dashboard but Prometheus is up, check **Status → Targets** in the Prometheus UI and align the hostname with your Railway service name.

### Same hostname on Vercel (optional)

The Next.js app can **proxy** paths to Grafana, Prometheus, and the raw metrics endpoint using **`rewrites`** in `[apps/web/next.config.ts](apps/web/next.config.ts)`. Set these in the Vercel project (and optionally in `.env.local` for local `next dev`):

| Variable | Purpose |
|----------|---------|
| `OBSERVABILITY_GRAFANA_ORIGIN` | Origin of the Grafana service (no path), e.g. `https://grafana-xxx.up.railway.app` |
| `OBSERVABILITY_PROMETHEUS_ORIGIN` | Origin of Prometheus, e.g. `https://prometheus-xxx.up.railway.app` |
| `OBSERVABILITY_API_METRICS_ORIGIN` | Origin of the Go API for `/metrics` (optional; defaults to `NEXT_PUBLIC_API_URL`) |

Public routes on the frontend (after deploy):

- `https://<vercel-domain>/grafana-dashboard` — Grafana UI  
- `https://<vercel-domain>/prometheus-dashboard` — Prometheus UI  
- `https://<vercel-domain>/booking-api-metrics` — plain Prometheus text from the API  

Grafana must believe its public URL is the Vercel path, not only the Railway URL: set **`GF_SERVER_ROOT_URL`** to `https://<your-vercel-domain>/grafana-dashboard` and **`GF_SERVER_SERVE_FROM_SUB_PATH=true`**, so Grafana serves assets and redirects under `/grafana-dashboard` on the upstream container. The rewrite forwards that same path to Railway. Without that, links and static assets inside Grafana break when accessed through Vercel.

Prometheus and Grafana remain **separate deployments** (for example on Railway); Vercel does not run those processes. The rewrites only forward browser requests. Exposing `/booking-api-metrics` on a public domain duplicates sensitive operational data outside the API host—treat it like any other production metrics endpoint.

The **site header** and the **Book a slot** page include links for these paths when **`NEXT_PUBLIC_SHOW_OBSERVABILITY_NAV`** is not set to `false` (default: visible). They open in new browser tabs so users can keep the app open.