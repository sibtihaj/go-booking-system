/**
 * Mermaid source for the IB Scheduling system architecture.
 * Rendered by {@link ArchitectureDiagram}; keep in sync with `architectureFlowSteps` in showcase.ts.
 *
 * Avoid: subgraph ids on edges; HTML in labels unless htmlLabels is on; comments containing the
 * word "default" near "classDef" (some Mermaid builds misparse %% lines).
 */
export const systemArchitectureMermaid = `
flowchart TB
  subgraph cl["Client Layer"]
    UI["Browser UI — Next.js App Router"]
  end

  subgraph nx["Edge / SSR"]
    MW["Middleware and SSR — session cookies"]
  end

  subgraph sp["Supabase Platform"]
    AUTH["Supabase Auth — OIDC JWKS"]
    DB[("Postgres — slots and reservations")]
  end

  subgraph go["Go Backend"]
    API["Go API — chi, go-oidc, pgx"]
  end

  UI <-->|"HTTP / RSC"| MW
  UI -->|"supabase-js"| AUTH
  MW -->|"refresh session"| AUTH
  UI -->|"Bearer JWT"| API
  API -->|"go-oidc validate"| AUTH
  API -->|"pgx SQL"| DB

  classDef cxFill fill:#ecfdf5,stroke:#10b981,color:#064e3b
  classDef nxFill fill:#f0f9ff,stroke:#0ea5e9,color:#0c4a6e
  classDef sxFill fill:#fdf2f8,stroke:#db2777,color:#500724
  classDef gxFill fill:#f0fdfa,stroke:#0d9488,color:#134e4a

  class UI cxFill
  class MW nxFill
  class AUTH sxFill
  class DB sxFill
  class API gxFill
`.trim();
