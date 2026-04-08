/**
 * Mermaid source for the IB Scheduling deployment topology.
 */
export const deploymentArchitectureMermaid = `
flowchart TB
  USER["Users / Browsers"]

  subgraph vercel["Vercel"]
    WEB["Next.js Frontend"]
  end

  subgraph supa["Supabase Cloud"]
    SAUTH["Supabase Auth"]
    SDB[("Supabase Postgres")]
  end

  subgraph railway["Railway"]
    GO["Go API Service"]
    PROM["Prometheus Container"]
    GRAF["Grafana Container"]
  end

  USER -->|"HTTPS"| WEB
  WEB -->|"supabase-js auth/session"| SAUTH
  WEB -->|"Bearer JWT + API calls"| GO
  GO -->|"OIDC/JWKS verification"| SAUTH
  GO -->|"SQL over pgx"| SDB
  GO -->|"exposes /metrics"| PROM
  GRAF -->|"PromQL dashboards"| PROM
  WEB -->|"embedded/proxied observability links"| GRAF
  WEB -->|"prometheus UI link"| PROM

  classDef userFill fill:#ecfeff,stroke:#0891b2,color:#164e63
  classDef vercelFill fill:#ecfdf5,stroke:#10b981,color:#065f46
  classDef supaFill fill:#f5f3ff,stroke:#8b5cf6,color:#4c1d95
  classDef railFill fill:#fff7ed,stroke:#f97316,color:#9a3412

  class USER userFill
  class WEB vercelFill
  class SAUTH supaFill
  class SDB supaFill
  class GO railFill
  class PROM railFill
  class GRAF railFill
`.trim();

