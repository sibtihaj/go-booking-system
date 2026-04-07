package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// Config holds runtime configuration loaded from the environment.
type Config struct {
	Addr                string
	DatabaseURL         string
	SupabaseJWTIssuer   string
	CORSAllowedOrigins  []string
	DBMaxConns          int32
	DBMinConns          int32
	DBMaxConnLifetime   time.Duration
	DBMaxConnIdleTime   time.Duration
	RequestTimeout      time.Duration
}

// Load reads configuration from environment variables with sensible defaults for local dev.
func Load() (*Config, error) {
	dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	issuer := strings.TrimSpace(os.Getenv("SUPABASE_JWT_ISSUER"))
	if issuer == "" {
		base := strings.TrimSpace(os.Getenv("SUPABASE_URL"))
		if base == "" {
			return nil, fmt.Errorf("SUPABASE_JWT_ISSUER or SUPABASE_URL is required")
		}
		base = strings.TrimRight(base, "/")
		issuer = base + "/auth/v1"
	}

	origins := []string{"http://localhost:3000"}
	if raw := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS")); raw != "" {
		parts := strings.Split(raw, ",")
		out := make([]string, 0, len(parts))
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				out = append(out, p)
			}
		}
		if len(out) > 0 {
			origins = out
		}
	}

	addr := strings.TrimSpace(os.Getenv("PORT"))
	if addr == "" {
		addr = "8080"
	}
	if !strings.Contains(addr, ":") {
		addr = ":" + addr
	}

	return &Config{
		Addr:               addr,
		DatabaseURL:        dbURL,
		SupabaseJWTIssuer:  issuer,
		CORSAllowedOrigins: origins,
		DBMaxConns:         10,
		DBMinConns:         0,
		DBMaxConnLifetime:  time.Hour,
		DBMaxConnIdleTime:  30 * time.Minute,
		RequestTimeout:     15 * time.Second,
	}, nil
}
