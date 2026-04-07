/**
 * Portfolio / educational copy for IB Scheduling.
 * Paths are relative to the monorepo root unless noted.
 */

export type ShowcaseBadge = "Architecture" | "Go API" | "Auth" | "Next.js" | "Database";

export type HttpHighlight = {
  method: string;
  path: string;
  note?: string;
};

export type CodeRef = {
  file: string;
  symbol?: string;
  note: string;
};

export type ShowcaseSection = {
  id: string;
  badge?: ShowcaseBadge;
  title: string;
  summary: string;
  bullets?: string[];
  http?: HttpHighlight;
  goRefs?: CodeRef[];
  tsRefs?: CodeRef[];
  codeSample?: string;
};

/** Request flow as plain steps (no mermaid runtime). */
export const architectureFlowSteps = [
  "Browser: Next.js App Router renders UI (TypeScript, React 19).",
  "Auth: User signs in via Supabase Auth; session lives in cookies (SSR middleware refreshes with createServerClient).",
  "API calls: Client sends Authorization: Bearer <supabase_access_token> to the Go service.",
  "Go: chi router → JWT middleware (go-oidc) → handlers use pgxpool against Supabase Postgres.",
  "Correctness: booking uses a transaction, row lock on slot, INSERT … ON CONFLICT DO NOTHING so two concurrent requests cannot confirm the same slot.",
] as const;

export const homeShowcaseSections: ShowcaseSection[] = [
  {
    id: "stack",
    badge: "Architecture",
    title: "Stack and separation",
    summary:
      "The UI is a Next.js frontend; the Go binary is a stateless HTTP API. Supabase provides Postgres + Auth so identity and booking data stay in one database.",
    bullets: [
      "apps/web — App Router, Supabase browser client, fetch wrapper with Bearer token.",
      "apps/api — chi, CORS, OIDC JWT verification, pgxpool, transactional handlers.",
      "db/migrations — DDL (resources, slots, reservations) applied to Supabase Postgres.",
    ],
    goRefs: [
      {
        file: "apps/api/cmd/server/main.go",
        note: "Wires chi middleware, CORS, /health, and /api/v1 routes with JWT middleware on protected handlers.",
      },
    ],
    tsRefs: [
      {
        file: "apps/web/src/lib/api.ts",
        note: "Attaches Authorization: Bearer for every call to the Go base URL.",
      },
    ],
  },
  {
    id: "flow",
    badge: "Architecture",
    title: "End-to-end request flow",
    summary:
      "Understand how a browser action becomes SQL: auth stays on the Supabase side for the session; authorization for API calls is the access JWT verified in Go.",
    bullets: [...architectureFlowSteps],
    codeSample:
      "// Conceptual (browser → Go)\n" +
      "fetch(process.env.NEXT_PUBLIC_API_URL + '/api/v1/availability?resource_id=…', {\n" +
      "  headers: { Authorization: 'Bearer ' + accessToken },\n" +
      "});",
  },
  {
    id: "why-go-db",
    badge: "Go API",
    title: "Why Go + Postgres for booking",
    summary:
      "Goroutines help throughput, but correctness comes from the database: unique constraints and short transactions beat in-memory locks when you run multiple API replicas.",
    bullets: [
      "handlers.CreateReservation: BeginTx → SELECT … FOR UPDATE on slot → INSERT … ON CONFLICT (slot_id) DO NOTHING RETURNING id.",
      "409 slot_unavailable when ON CONFLICT yields no row; 404 when slot id does not exist.",
    ],
    goRefs: [
      {
        file: "apps/api/internal/handlers/handlers.go",
        symbol: "CreateReservation",
        note: "Transactional booking with row lock and idempotent insert.",
      },
      {
        file: "apps/api/internal/db/pool.go",
        symbol: "NewPool",
        note: "pgxpool configuration and Ping on startup.",
      },
    ],
  },
];

export const loginShowcaseSections: ShowcaseSection[] = [
  {
    id: "supabase-session",
    badge: "Auth",
    title: "Supabase Auth in the browser",
    summary:
      "This app uses @supabase/supabase-js with the anon key in the browser only. Email/password (and sign-up with email confirmation) talk to Supabase Auth — not to the Go API.",
    bullets: [
      "signInWithPassword / signUp set a session; cookies are maintained for SSR via @supabase/ssr.",
      "Go never receives the anon key. Protected API calls send only the user’s access_token as Bearer.",
    ],
    tsRefs: [
      {
        file: "apps/web/src/lib/supabase/client.ts",
        symbol: "createClient",
        note: "Browser Supabase client (anon key).",
      },
      {
        file: "apps/web/src/app/login/page.tsx",
        note: "signInWithPassword after the user has an account.",
      },
      {
        file: "apps/web/src/app/signup/page.tsx",
        note: "signUp with emailRedirectTo → /auth/callback?next=…",
      },
    ],
  },
  {
    id: "middleware-gate",
    badge: "Next.js",
    title: "Middleware: session refresh + /book gate",
    summary:
      "Edge middleware calls supabase.auth.getUser() so the session stays fresh. Unauthenticated visits to /book redirect to /login with next=/book.",
    bullets: [
      "createServerClient reads/writes cookies on the NextResponse clone.",
      "Public marketing routes skip redirect; only /book is gated in this MVP.",
    ],
    tsRefs: [
      {
        file: "apps/web/src/lib/supabase/middleware.ts",
        symbol: "updateSession",
        note: "Cookie adapter + getUser + redirect when path starts with /book and no user.",
      },
      {
        file: "apps/web/src/middleware.ts",
        note: "Applies updateSession to matched routes.",
      },
    ],
  },
  {
    id: "pkce-callback",
    badge: "Auth",
    title: "PKCE / email link: /auth/callback",
    summary:
      "After email confirmation, Supabase redirects with ?code=. The route handler exchanges the code for a session server-side.",
    bullets: [
      "exchangeCodeForSession(code) sets auth cookies.",
      "Then NextResponse.redirect sends the user to next (default /book).",
    ],
    http: { method: "GET", path: "/auth/callback?code=…&next=…" },
    tsRefs: [
      {
        file: "apps/web/src/app/auth/callback/route.ts",
        note: "createClient (server) + exchangeCodeForSession + redirect.",
      },
    ],
  },
  {
    id: "go-jwt",
    badge: "Go API",
    title: "What Go validates on each protected request",
    summary:
      "The Go API is not logged in as “the user” — it verifies the JWT cryptographically and reads sub (Supabase user id) for inserts.",
    bullets: [
      "github.com/coreos/go-oidc/v3: NewProvider(issuer), Verifier with ClientID: \"authenticated\".",
      "Middleware: Authorization Bearer → Verify → uuid.Parse(sub) → context.",
    ],
    goRefs: [
      {
        file: "apps/api/internal/auth/middleware.go",
        symbol: "JWTVerifier.Middleware",
        note: "Bearer parse, Verify, Claims, WithUserID on context.",
      },
    ],
  },
];

export const bookShowcaseSections: ShowcaseSection[] = [
  {
    id: "load-availability",
    badge: "Go API",
    title: "Loading open slots",
    summary:
      "The UI calls GET /api/v1/availability with the Supabase access token. The handler returns future slots for a resource that have no confirmed reservation (LEFT JOIN + r.id IS NULL).",
    http: { method: "GET", path: "/api/v1/availability?resource_id=<uuid>" },
    bullets: [
      "handlers.Availability validates resource_id, pgxpool.Query with timestamptz scan → RFC3339 strings in JSON.",
      "Client: apiFetchJson in apps/web/src/lib/api.ts with Bearer from supabase.auth.getSession().",
    ],
    goRefs: [
      {
        file: "apps/api/internal/handlers/handlers.go",
        symbol: "Availability",
        note: "SQL selects open slots; limit 200.",
      },
    ],
    tsRefs: [
      {
        file: "apps/web/src/app/book/page.tsx",
        note: "load() reads session, then GET availability for NEXT_PUBLIC_DEFAULT_RESOURCE_ID or demo UUID.",
      },
    ],
  },
  {
    id: "reserve-slot",
    badge: "Go API",
    title: "Reserving a slot (race-safe)",
    summary:
      "POST /api/v1/reservations sends { slot_id }. The handler uses the JWT user id for user_id and runs a single transaction: lock slot row, insert reservation, commit.",
    http: { method: "POST", path: "/api/v1/reservations", note: "Body: { \"slot_id\": \"uuid\" }" },
    bullets: [
      "BEGIN → SELECT 1 FROM slots WHERE id = $1 FOR UPDATE (serializes competing bookings).",
      "INSERT INTO reservations … ON CONFLICT (slot_id) DO NOTHING RETURNING id — unique on slot_id enforces one confirmed booking per slot.",
      "Empty RETURNING → 409 slot_unavailable; missing slot → 404.",
    ],
    goRefs: [
      {
        file: "apps/api/internal/handlers/handlers.go",
        symbol: "CreateReservation",
        note: "BeginTx, lock, insert, Commit.",
      },
    ],
    codeSample: `// Simplified SQL shape\nBEGIN;\nSELECT 1 FROM slots WHERE id = $1 FOR UPDATE;\nINSERT INTO reservations (slot_id, user_id, status)\nVALUES ($1, $2, 'confirmed')\nON CONFLICT (slot_id) DO NOTHING\nRETURNING id;\nCOMMIT;`,
  },
];

/** Full /how-it-works page: extended sections + API table */
export const howItWorksIntro: ShowcaseSection = {
  id: "intro",
  badge: "Architecture",
  title: "How IB Scheduling is wired",
  summary:
    "This project demonstrates a clear split: TypeScript for the product UI and session handling, Go for authoritative booking logic and JWT verification, Supabase for Postgres + Auth.",
  bullets: [
    "Identity: Supabase Auth issues JWTs; Next keeps the session; Go verifies tokens with OIDC.",
    "Data: Single Postgres (Supabase); Go connects with DATABASE_URL (service/pooler role — never expose in the browser).",
    "Deploy pattern: Next on Vercel (typical) + Go on Railway (long-lived) + CORS restricted to the web origin.",
    "See the Mermaid system diagram on this page (#system-architecture); source lives in apps/web/src/content/system-architecture.mmd.ts.",
  ],
};

export const apiEndpointsTable: {
  method: string;
  path: string;
  auth: "none" | "Bearer (Supabase access_token)";
  handler: string;
  file: string;
}[] = [
  {
    method: "GET",
    path: "/health",
    auth: "none",
    handler: "API.Health",
    file: "apps/api/internal/handlers/handlers.go",
  },
  {
    method: "GET",
    path: "/api/v1/availability",
    auth: "Bearer (Supabase access_token)",
    handler: "API.Availability",
    file: "apps/api/internal/handlers/handlers.go",
  },
  {
    method: "POST",
    path: "/api/v1/reservations",
    auth: "Bearer (Supabase access_token)",
    handler: "API.CreateReservation",
    file: "apps/api/internal/handlers/handlers.go",
  },
];

export const databaseConstraintsBullets = [
  "public.resources — bookable entity.",
  "public.slots — UNIQUE (resource_id, starts_at) defines discrete windows.",
  "public.reservations — UNIQUE (slot_id) ensures at most one confirmed row per slot (ON CONFLICT target).",
  "reservations.user_id REFERENCES auth.users(id) — aligns with JWT sub.",
];

export const deployBullets = [
  "apps/api: Dockerfile; set DATABASE_URL, SUPABASE_URL (or SUPABASE_JWT_ISSUER), CORS_ALLOWED_ORIGINS.",
  "apps/web: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL.",
  "See DEPLOY.md at repo root for Supabase redirect URLs and local dev commands.",
];

/** All educational sections for the /how-it-works page (accordion). */
export const howItWorksAllSections: ShowcaseSection[] = [
  ...homeShowcaseSections,
  ...loginShowcaseSections,
  ...bookShowcaseSections,
];
