/**
 * Mermaid source for the IB Scheduling deployment topology.
 */
export const deploymentArchitectureMermaid = `
flowchart TB
  USER["Users / Browsers"]

  subgraph vercel["Vercel"]
    WEB["Next.js Frontend"]
    VPROXY["Vercel rewrites: /grafana-dashboard, /prometheus-dashboard"]
  end

  subgraph supa["Supabase Cloud"]
    SAUTH["Supabase Auth"]
    SDB[("Supabase Postgres")]
  end

  subgraph railway["Railway"]
    GO["Go API Service"]
    MET["Go /metrics endpoint"]
    PROM["Prometheus Container"]
    GRAF["Grafana Container"]
  end

  USER -->|"HTTPS"| WEB
  WEB -->|"supabase-js auth/session"| SAUTH
  WEB -->|"Bearer JWT + API calls"| GO
  GO -->|"OIDC/JWKS verification"| SAUTH
  GO -->|"SQL over pgx"| SDB
  GO -->|"exports Prometheus counters/gauges"| MET
  PROM -->|"scrapes /metrics"| MET
  GRAF -->|"PromQL dashboards"| PROM
  USER -->|"open observability pages via app domain"| VPROXY
  VPROXY -->|"proxy to Railway Grafana"| GRAF
  VPROXY -->|"proxy to Railway Prometheus"| PROM

  classDef userFill fill:#ecfeff,stroke:#0891b2,color:#164e63
  classDef vercelFill fill:#ecfdf5,stroke:#10b981,color:#065f46
  classDef supaFill fill:#f5f3ff,stroke:#8b5cf6,color:#4c1d95
  classDef railFill fill:#fff7ed,stroke:#f97316,color:#9a3412

  class USER userFill
  class WEB vercelFill
  class VPROXY vercelFill
  class SAUTH supaFill
  class SDB supaFill
  class GO railFill
  class MET railFill
  class PROM railFill
  class GRAF railFill
`.trim();

