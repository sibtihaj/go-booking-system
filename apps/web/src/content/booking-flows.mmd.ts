/**
 * Mermaid sources for booking-specific flows on /book.
 * Rendered by BookingArchitectureDiagrams. Keep aligned with apps/api handlers.
 */

/** POST /api/v1/reservations — transactional booking. */
export const bookingReservationFlowMermaid = `
flowchart TB
  subgraph c1["Client"]
    UI["Browser /book"]
  end
  subgraph g1["Go API"]
    RTR["chi plus JWT middleware"]
    HND["CreateReservation"]
    POOL["pgx pool"]
  end
  subgraph s1["Supabase"]
    OIDC["Auth issuer JWKS"]
    PG[("Postgres")]
  end

  UI -->|POST reservations Bearer JWT| RTR
  RTR --> HND
  HND -.->|verify JWT| OIDC
  HND -->|txn lock slot insert reservation| POOL
  POOL --> PG

  classDef ui fill:#ecfdf5,stroke:#10b981,color:#064e3b
  classDef gx fill:#f0fdfa,stroke:#0d9488,color:#134e4a
  classDef sx fill:#fdf2f8,stroke:#db2777,color:#500724
  class UI ui
  class RTR,HND,POOL gx
  class OIDC,PG sx
`.trim();

/** GET /availability and GET /reservations — read paths. */
export const bookingFetchFlowMermaid = `
flowchart TB
  subgraph c2["Client"]
    UI2["Browser /book"]
  end
  subgraph g2["Go API"]
    RTR2["chi plus JWT middleware"]
    AV["Availability"]
    LR["ListMyReservations"]
    POOL2["pgx pool"]
  end
  subgraph s2["Supabase"]
    OIDC2["Auth issuer"]
    PG2[("Postgres")]
  end

  UI2 -->|GET availability resource_id| RTR2
  UI2 -->|GET reservations| RTR2
  RTR2 --> AV
  RTR2 --> LR
  RTR2 -.->|verify JWT| OIDC2
  AV -->|open slots query| POOL2
  LR -->|my bookings query| POOL2
  POOL2 --> PG2

  classDef ui fill:#ecfdf5,stroke:#10b981,color:#064e3b
  classDef gx fill:#f0fdfa,stroke:#0d9488,color:#134e4a
  classDef sx fill:#fdf2f8,stroke:#db2777,color:#500724
  class UI2 ui
  class RTR2,AV,LR,POOL2 gx
  class OIDC2,PG2 sx
`.trim();

/** POST /api/v1/slots — operator adds bookable windows. */
export const bookingSlotCreateFlowMermaid = `
flowchart TB
  subgraph c3["Client"]
    UI3["Add availability form"]
  end
  subgraph g3["Go API"]
    RTR3["chi plus JWT middleware"]
    SLOT["CreateSlot"]
    POOL3["pgx pool"]
  end
  subgraph s3["Supabase"]
    PG3[("Postgres slots")]
  end

  UI3 -->|POST slots Bearer JWT| RTR3
  UI3 -.->|optional Admin Key header| RTR3
  RTR3 --> SLOT
  SLOT -->|INSERT slots| POOL3
  POOL3 --> PG3

  classDef ui fill:#ecfdf5,stroke:#10b981,color:#064e3b
  classDef gx fill:#f0fdfa,stroke:#0d9488,color:#134e4a
  classDef sx fill:#fdf2f8,stroke:#db2777,color:#500724
  class UI3 ui
  class RTR3,SLOT,POOL3 gx
  class PG3 sx
`.trim();
