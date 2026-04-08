## Learned User Preferences

- Prefer a light theme while keeping accent gradients (avoid dark-only UI).
- Public README and deployment docs should explain how things were set up for viewers of the public repo, in clear professional English, not only as bare command checklists.
- Keep sign-in and primary booking actions visually separated and prominent.

## Learned Workspace Facts

- The product is branded IB Scheduling and is a portfolio showcase for Go, TypeScript, and system architecture, with educational copy explaining behavior across the app.
- Monorepo: Next.js (`apps/web`, shadcn/ui), Go API (`apps/api`), Supabase for auth and database; run git from the repository root.
- For local development, the Next.js app typically serves on port 3000 and the Go API on 8080; API database URL comes from environment variables loaded for the API (for example `apps/api` `.env`), not from the web app’s `.env.local`.
- Observability uses Prometheus and Grafana (often via Docker Compose); the Next.js app may proxy or link to them; Grafana and Prometheus UIs also appear in the main nav and on the booking flow.
- The page titled Application Architecture replaced the former “How it works” content; Next.js-specific agent rules live in `apps/web/AGENTS.md`.
