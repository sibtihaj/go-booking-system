// Package obsmetrics registers Prometheus collectors for the Go booking API (pool, runtime, bookings).
package obsmetrics

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics holds counters/gauges the HTTP handlers increment. Safe when nil (no-op).
type Metrics struct {
	Registry *prometheus.Registry

	ReservationsTotal *prometheus.CounterVec
	BenchmarkRuns     *prometheus.CounterVec
	HTTPRequests      *prometheus.CounterVec
	// MimicEmailTotal / MimicWhatsAppTotal: demo-only “provider” calls; label code is HTTP status
	// (e.g. "200", "429") or "client_error" when the outbound request fails before a response.
	MimicEmailTotal    *prometheus.CounterVec
	MimicWhatsAppTotal *prometheus.CounterVec
}

// New builds a dedicated registry with Go/process collectors, pgx pool gauges, goroutine gauge,
// and booking-related counters. Pass the registry to promhttp and wire Metrics into handlers.API.
func New(pool *pgxpool.Pool) *Metrics {
	reg := prometheus.NewRegistry()
	reg.MustRegister(collectors.NewGoCollector())
	reg.MustRegister(collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}))

	reg.MustRegister(prometheus.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "pgx_pool_acquired_conns",
			Help: "Connections currently acquired from the pgx pool.",
		},
		func() float64 { return float64(pool.Stat().AcquiredConns()) },
	))
	reg.MustRegister(prometheus.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "pgx_pool_idle_conns",
			Help: "Idle connections in the pgx pool.",
		},
		func() float64 { return float64(pool.Stat().IdleConns()) },
	))
	reg.MustRegister(prometheus.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "pgx_pool_total_conns",
			Help: "Total connections in the pgx pool (acquired + idle).",
		},
		func() float64 { return float64(pool.Stat().TotalConns()) },
	))
	reg.MustRegister(prometheus.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "pgx_pool_max_conns",
			Help: "Configured maximum connections for the pgx pool.",
		},
		func() float64 { return float64(pool.Stat().MaxConns()) },
	))
	reg.MustRegister(prometheus.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "pgx_pool_constructing_conns",
			Help: "Connections currently being established in the pgx pool.",
		},
		func() float64 { return float64(pool.Stat().ConstructingConns()) },
	))
	reg.MustRegister(prometheus.NewCounterFunc(
		prometheus.CounterOpts{
			Name: "pgx_pool_acquire_count_total",
			Help: "Cumulative successful acquires from the pgx pool.",
		},
		func() float64 { return float64(pool.Stat().AcquireCount()) },
	))

	reservations := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "booking_reservations_total",
			Help: "Reservation attempts by outcome: POST /reservations and each successful/failed row in booking-rush benchmark (same ReserveConfirmedSlot path).",
		},
		[]string{"result"},
	)
	benchmark := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "booking_benchmark_runs_total",
			Help: "Booking rush benchmark runs by outcome.",
		},
		[]string{"result"},
	)
	httpReq := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "api_http_requests_total",
			Help: "HTTP requests handled by the Go API (excludes /metrics scrape).",
		},
		[]string{"method", "code"},
	)
	mimicEmail := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "booking_mimic_email_notifications_total",
			Help: "Mimic email confirmation calls after a successful benchmark reservation (label code = HTTP status or client_error).",
		},
		[]string{"code"},
	)
	mimicWA := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "booking_mimic_whatsapp_notifications_total",
			Help: "Mimic WhatsApp notification calls after a successful benchmark reservation (label code = HTTP status or client_error).",
		},
		[]string{"code"},
	)
	reg.MustRegister(reservations)
	reg.MustRegister(benchmark)
	reg.MustRegister(httpReq)
	reg.MustRegister(mimicEmail)
	reg.MustRegister(mimicWA)

	return &Metrics{
		Registry:           reg,
		ReservationsTotal:  reservations,
		BenchmarkRuns:      benchmark,
		HTTPRequests:       httpReq,
		MimicEmailTotal:    mimicEmail,
		MimicWhatsAppTotal: mimicWA,
	}
}

// HTTPMiddleware counts responses by method and status code. Skips /metrics to avoid scrape noise.
func (m *Metrics) HTTPMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/metrics" {
				next.ServeHTTP(w, r)
				return
			}
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			next.ServeHTTP(ww, r)
			if m != nil && m.HTTPRequests != nil {
				m.HTTPRequests.WithLabelValues(r.Method, strconv.Itoa(ww.Status())).Inc()
			}
		})
	}
}

// Handler serves GET /metrics for Prometheus scraping.
func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.Registry, promhttp.HandlerOpts{
		Registry:          m.Registry,
		EnableOpenMetrics: true,
	})
}

// IncReservation records a reservation outcome: created, conflict, not_found, error, invalid_body.
func (m *Metrics) IncReservation(result string) {
	if m == nil || m.ReservationsTotal == nil {
		return
	}
	m.ReservationsTotal.WithLabelValues(result).Inc()
}

// IncBenchmarkRun records benchmark completion: success or error.
func (m *Metrics) IncBenchmarkRun(result string) {
	if m == nil || m.BenchmarkRuns == nil {
		return
	}
	m.BenchmarkRuns.WithLabelValues(result).Inc()
}

// IncMimicEmail records one mimic email notification attempt (code = HTTP status as string or client_error).
func (m *Metrics) IncMimicEmail(code string) {
	if m == nil || m.MimicEmailTotal == nil {
		return
	}
	m.MimicEmailTotal.WithLabelValues(code).Inc()
}

// IncMimicWhatsApp records one mimic WhatsApp notification attempt.
func (m *Metrics) IncMimicWhatsApp(code string) {
	if m == nil || m.MimicWhatsAppTotal == nil {
		return
	}
	m.MimicWhatsAppTotal.WithLabelValues(code).Inc()
}
