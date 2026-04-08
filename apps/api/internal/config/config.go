package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
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
	BenchmarkMaxN       int
	BenchmarkHardMaxN   int
	BenchmarkSecret     string
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
			if origin := normalizeCORSOrigin(p); origin != "" {
				out = append(out, origin)
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

	dbMax := int32(10)
	if raw := strings.TrimSpace(os.Getenv("DB_MAX_CONNS")); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 && v <= 500 {
			dbMax = int32(v)
		}
	}

	benchMax := 10000
	if raw := strings.TrimSpace(os.Getenv("BENCHMARK_MAX_N")); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			benchMax = v
		}
	}

	benchHard := 10000
	if raw := strings.TrimSpace(os.Getenv("BENCHMARK_HARD_MAX_N")); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			benchHard = v
		}
	}

	reqTimeout := 15 * time.Second
	if raw := strings.TrimSpace(os.Getenv("REQUEST_TIMEOUT")); raw != "" {
		if d, err := time.ParseDuration(raw); err == nil && d > 0 {
			reqTimeout = d
		}
	}

	return &Config{
		Addr:               addr,
		DatabaseURL:        dbURL,
		SupabaseJWTIssuer:  issuer,
		CORSAllowedOrigins: origins,
		DBMaxConns:         dbMax,
		DBMinConns:         0,
		DBMaxConnLifetime:  time.Hour,
		DBMaxConnIdleTime:  30 * time.Minute,
		RequestTimeout:     reqTimeout,
		BenchmarkMaxN:      benchMax,
		BenchmarkHardMaxN:  benchHard,
		BenchmarkSecret:    strings.TrimSpace(os.Getenv("BENCHMARK_SECRET")),
	}, nil
}

func normalizeCORSOrigin(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return strings.TrimRight(raw, "/")
	}
	// CORS origin matching is exact scheme+host(+port), without path/trailing slash.
	return parsed.Scheme + "://" + parsed.Host
}
