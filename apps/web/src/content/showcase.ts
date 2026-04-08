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

export type ShowcaseCustomContent = "booking-architecture";

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
  /** Embeds extra UI inside the accordion (e.g. Mermaid diagrams on /book). */
  customContent?: ShowcaseCustomContent;
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
    id: "booking-architecture",
    badge: "Architecture",
    title: "Booking flow — who talks to whom",
    summary:
      "Three diagrams: making a reservation (POST), fetching data on this page (GET availability + GET reservations), and creating slots (POST). Browser talks to the Go API with a Bearer JWT; Go verifies tokens against Supabase Auth and runs SQL via pgx against Postgres.",
    customContent: "booking-architecture",
    tsRefs: [
      {
        file: "apps/web/src/content/booking-flows.mmd.ts",
        note: "Mermaid source for the diagrams below.",
      },
    ],
  },
  {
    id: "concurrency-go-typescript",
    badge: "Architecture",
    title: "Concurrency, pooling, and why the booking engine is Go (not Node)",
    summary:
      "The UI stays in TypeScript (Next.js). The authoritative booking API is a separate Go process so we get cheap goroutines per request, efficient I/O scheduling, and a small memory footprint under parallel load. Correctness still comes from Postgres (row locks + unique constraints), but the service layer can sustain many concurrent short transactions without the same event-loop and GC pressure as a typical Node HTTP server handling the same pattern.",
    bullets: [
      "Node / Server Actions / API routes: one thread runs JavaScript; concurrency is cooperative async/await. Throughput is often excellent, but under a burst of parallel booking work, tail latency can grow from scheduling, GC, and pool contention — you still size a DB pool (e.g. node-postgres) to match Postgres.",
      "Go + chi: each request runs in its own goroutine; the runtime multiplexes thousands of lightweight goroutines onto OS threads. For many I/O-bound handlers (JWT verify + BEGIN … FOR UPDATE + COMMIT), this shape often shows lower per-request overhead and more predictable behavior at high concurrency than a single Node process — exact numbers depend on hardware and DB limits.",
      "Illustrative ballpark (not measured in-repo): a Node route and a Go handler talking to the same pool and Postgres might both complete one booking in low milliseconds; under heavy parallel contention, Go frequently keeps P99 latency tighter because goroutine scheduling overhead is tiny compared with DB wait time — but the database and Supavisor limits dominate either way.",
      "Supabase / Postgres: use a pooled connection string from the dashboard (Session or Transaction pooler for IPv4). The pooler has separate limits for client connections vs backend connections to Postgres; your app’s pgxpool MaxConns should stay well below Postgres max_connections and the pooler’s capacity. See Supabase docs: “Connection management” and “compute and disk” for tier limits.",
      "10,000 concurrent operations: the Go server can start 10,000 goroutines, but only DBMaxConns simultaneous transactions hit Postgres — the rest wait on the pool (by design). A nano/free-tier instance is not sized for sustained 10k bookings/sec; use this demo up to a few hundred on shared tiers, load-test larger values on dedicated compute with monitoring.",
      "Goroutines vs connection pooling (simulation): each goroutine runs BeginTx → reserve → Commit, but pgxpool.Acquire hands out at most MaxConns connections. If 500 goroutines run and MaxConns is 10, only 10 hold a live transaction at any instant; the other 490 block until a connection frees. That back-pressure protects Postgres from being opened unbounded; wall-clock time for the concurrent phase grows with N/pool width, not with goroutine count alone.",
      "Interactive stress test: on /book, use the “Concurrent booking simulation” panel under Available Windows — it calls the same reserve path as Reserve Slot, in parallel, then cleans up. The JSON response includes db_max_conns and a note reiterating pool behavior.",
    ],
    http: {
      method: "POST",
      path: "/api/v1/benchmark/booking-rush",
      note: 'Body: { "n": number, "resource_id": "uuid" } — creates N slots, N concurrent reserves, then deletes (stress demo).',
    },
    goRefs: [
      {
        file: "apps/api/internal/handlers/benchmark.go",
        symbol: "BenchmarkBookingRush",
        note: "Batch insert slots; WaitGroup + goroutines calling ReserveConfirmedSlot; cleanup.",
      },
      {
        file: "apps/api/internal/handlers/handlers.go",
        symbol: "ReserveConfirmedSlot",
        note: "Shared transactional path with POST /reservations.",
      },
      {
        file: "apps/api/internal/db/pool.go",
        symbol: "NewPool",
        note: "pgxpool; tune DB_MAX_CONNS for your Supabase tier.",
      },
    ],
    tsRefs: [
      {
        file: "apps/web/src/components/booking/booking-concurrency-lab.tsx",
        note: "Runner on /book; input capped at 10_000; POST /api/v1/benchmark/booking-rush.",
      },
    ],
  },
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
  {
    id: "list-reservations",
    badge: "Go API",
    title: "Listing your bookings",
    summary:
      "GET /api/v1/reservations returns confirmed reservations for the JWT subject, joined to slots for start/end times and resource id.",
    http: { method: "GET", path: "/api/v1/reservations" },
    bullets: [
      "handlers.ListMyReservations filters r.user_id = JWT sub and r.status = 'confirmed'.",
      "Ordered by slot start time descending; limit 100.",
    ],
    goRefs: [
      {
        file: "apps/api/internal/handlers/handlers.go",
        symbol: "ListMyReservations",
        note: "JOIN slots for times; JSON RFC3339.",
      },
    ],
    tsRefs: [
      {
        file: "apps/web/src/components/booking/booking-extras.tsx",
        note: "“Your reservations” panel; parent load() merges with availability.",
      },
    ],
  },
  {
    id: "create-slot",
    badge: "Go API",
    title: "Adding bookable slots",
    summary:
      "POST /api/v1/slots with { resource_id, starts_at, ends_at } inserts a row. Optional SLOT_CREATE_SECRET requires X-Slot-Admin-Key; if unset, any authenticated user may create slots (demo only).",
    http: {
      method: "POST",
      path: "/api/v1/slots",
      note: 'Body: { "resource_id", "starts_at", "ends_at" } (RFC3339)',
    },
    bullets: [
      "409 slot_duplicate on UNIQUE (resource_id, starts_at) violation.",
      "Validate ends_at > starts_at before insert.",
    ],
    goRefs: [
      {
        file: "apps/api/internal/handlers/handlers.go",
        symbol: "CreateSlot",
        note: "Optional secret gate; insert returning OpenSlot shape.",
      },
    ],
    tsRefs: [
      {
        file: "apps/web/src/components/booking/booking-extras.tsx",
        note: "“Add availability” form with datetime-local → ISO.",
      },
    ],
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
    path: "/api/v1/db-status",
    auth: "Bearer (Supabase access_token)",
    handler: "API.DBStatus",
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
    method: "GET",
    path: "/api/v1/reservations",
    auth: "Bearer (Supabase access_token)",
    handler: "API.ListMyReservations",
    file: "apps/api/internal/handlers/handlers.go",
  },
  {
    method: "POST",
    path: "/api/v1/reservations",
    auth: "Bearer (Supabase access_token)",
    handler: "API.CreateReservation",
    file: "apps/api/internal/handlers/handlers.go",
  },
  {
    method: "POST",
    path: "/api/v1/slots",
    auth: "Bearer (Supabase access_token)",
    handler: "API.CreateSlot",
    file: "apps/api/internal/handlers/handlers.go",
  },
  {
    method: "POST",
    path: "/api/v1/benchmark/booking-rush",
    auth: "Bearer (Supabase access_token)",
    handler: "API.BenchmarkBookingRush",
    file: "apps/api/internal/handlers/benchmark.go",
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
