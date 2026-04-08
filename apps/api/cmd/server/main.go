package main

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/go-booking-system/api/internal/auth"
	"github.com/go-booking-system/api/internal/config"
	"github.com/go-booking-system/api/internal/db"
	"github.com/go-booking-system/api/internal/handlers"
	"github.com/go-booking-system/api/internal/obsmetrics"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

// loadDotEnv finds .env by walking up from the working directory. That way it works when you run
// `go run .` or `go run main.go` from apps/api/cmd/server, from apps/api, or from the monorepo root.
func loadDotEnv() {
	wd, err := os.Getwd()
	if err != nil {
		return
	}
	dir := wd
	for {
		candidates := []string{
			filepath.Join(dir, ".env"),
			filepath.Join(dir, "apps", "api", ".env"),
		}
		for _, p := range candidates {
			if _, err := os.Stat(p); err != nil {
				continue
			}
			_ = godotenv.Load(p)
			return
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
}

func main() {
	loadDotEnv()

	ctx := context.Background()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("config", "error", err)
		os.Exit(1)
	}

	pool, err := db.NewPool(ctx, cfg)
	if err != nil {
		logger.Error("database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	verifier, err := auth.NewJWTVerifier(ctx, cfg.SupabaseJWTIssuer)
	if err != nil {
		logger.Error("oidc", "error", err)
		os.Exit(1)
	}

	var om *obsmetrics.Metrics
	if strings.TrimSpace(os.Getenv("ENABLE_PROMETHEUS_METRICS")) != "false" {
		om = obsmetrics.New(pool)
	}

	mimicBase := loopbackHTTPBase(cfg.Addr)
	if b := strings.TrimSpace(os.Getenv("MIMIC_HTTP_BASE")); b != "" {
		mimicBase = strings.TrimRight(b, "/")
	}
	mimicClient := &http.Client{
		Timeout: 60 * time.Second,
		Transport: &http.Transport{
			MaxConnsPerHost:     16384,
			MaxIdleConns:        16384,
			MaxIdleConnsPerHost: 16384,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	api := &handlers.API{
		Pool:              pool,
		SlotCreateSecret:  strings.TrimSpace(os.Getenv("SLOT_CREATE_SECRET")),
		BenchmarkMaxN:     cfg.BenchmarkMaxN,
		BenchmarkHardMaxN: cfg.BenchmarkHardMaxN,
		BenchmarkSecret:   cfg.BenchmarkSecret,
		Metrics:           om,
		MimicBaseURL:      mimicBase,
		MimicHTTPClient:   mimicClient,
	}

	r := chi.NewRouter()
	r.Use(middleware.RealIP)
	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)
	if om != nil {
		r.Use(om.HTTPMiddleware())
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Slot-Admin-Key", "X-Benchmark-Key"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", api.Health)
	if om != nil {
		r.Handle("/metrics", om.Handler())
	}

	r.Route("/api/v1", func(r chi.Router) {
		r.Group(func(r chi.Router) {
			r.Use(middleware.Timeout(cfg.RequestTimeout))
			r.With(verifier.Middleware).Get("/db-status", api.DBStatus)
			r.With(verifier.Middleware).Get("/availability", api.Availability)
			r.With(verifier.Middleware).Get("/reservations", api.ListMyReservations)
			r.With(verifier.Middleware).Post("/reservations", api.CreateReservation)
			r.With(verifier.Middleware).Post("/slots", api.CreateSlot)
			r.With(verifier.Middleware).Post("/mimic/notification/email", api.MimicEmailPost)
			r.With(verifier.Middleware).Post("/mimic/notification/whatsapp", api.MimicWhatsAppPost)
		})
		r.Group(func(r chi.Router) {
			r.Use(middleware.Timeout(5 * time.Minute))
			r.With(verifier.Middleware).Post("/benchmark/booking-rush", api.BenchmarkBookingRush)
		})
	})

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("listening", "addr", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown", "error", err)
	}
}

// loopbackHTTPBase returns an http://127.0.0.1:<port> URL for self-HTTP from handlers (benchmark → mimic routes).
func loopbackHTTPBase(listenAddr string) string {
	listenAddr = strings.TrimSpace(listenAddr)
	if listenAddr == "" {
		return "http://127.0.0.1:8080"
	}
	if !strings.Contains(listenAddr, ":") {
		return "http://127.0.0.1:" + listenAddr
	}
	if strings.HasPrefix(listenAddr, ":") {
		return "http://127.0.0.1" + listenAddr
	}
	host, port, err := net.SplitHostPort(listenAddr)
	if err != nil {
		return "http://127.0.0.1" + listenAddr
	}
	if host == "0.0.0.0" || host == "::" || host == "" {
		return "http://127.0.0.1:" + port
	}
	return "http://" + net.JoinHostPort(host, port)
}
