package handlers

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/go-booking-system/api/internal/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// BenchmarkBookingRushRequest is the JSON body for POST /benchmark/booking-rush.
type BenchmarkBookingRushRequest struct {
	N          int       `json:"n"`
	ResourceID uuid.UUID `json:"resource_id"`
}

// BenchmarkBookingRushResponse reports wall-clock timings and outcome counts.
type BenchmarkBookingRushResponse struct {
	N                 int     `json:"n"`
	ResourceID        string  `json:"resource_id"`
	SlotsCreatedMs    float64 `json:"slots_created_ms"`
	ConcurrentPhaseMs   float64 `json:"concurrent_phase_ms"`
	CleanupMs         float64 `json:"cleanup_ms"`
	TotalMs           float64 `json:"total_ms"`
	ReservationsOK    int64   `json:"reservations_ok"`
	ReservationsFail  int64   `json:"reservations_fail"`
	DBMaxConns        int32   `json:"db_max_conns"`
	AllowedMaxN       int     `json:"allowed_max_n"`
	Note              string  `json:"note"`
}

// BenchmarkBookingRush inserts N future slots, runs N concurrent reservation transactions (same JWT user),
// then deletes the created rows. Intended to demonstrate goroutines + pgx pool under Postgres correctness.
func (a *API) BenchmarkBookingRush(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
		return
	}

	userID, ok := auth.UserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var body BenchmarkBookingRushRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.N < 1 || body.ResourceID == uuid.Nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_body"})
		return
	}

	allowed, hardMax := a.effectiveBenchmarkLimits(r)
	if body.N > allowed {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":      "n_too_large",
			"max_n":      allowed,
			"hard_max_n": hardMax,
			"hint":       "Set X-Benchmark-Key to match BENCHMARK_SECRET on the API to raise the limit (local/stress only).",
		})
		return
	}

	n := body.N
	ctx := r.Context()

	var slotIDs []uuid.UUID
	var createdMs, phaseMs, cleanMs float64

	t0 := time.Now()

	// --- Create N slots in one transaction (unique on resource_id + starts_at) ---
	{
		tx, err := a.Pool.BeginTx(ctx, pgx.TxOptions{})
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tx_begin_failed"})
			return
		}
		defer func() { _ = tx.Rollback(ctx) }()

		slotIDs = make([]uuid.UUID, n)
		base := time.Now().UTC().Add(72 * time.Hour)
		const insertQ = `
insert into public.slots (resource_id, starts_at, ends_at)
values ($1, $2, $3)
returning id
`
		for i := 0; i < n; i++ {
			starts := base.Add(time.Duration(i) * time.Minute)
			ends := starts.Add(30 * time.Minute)
			var id uuid.UUID
			if err := tx.QueryRow(ctx, insertQ, body.ResourceID, starts, ends).Scan(&id); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "slot_batch_insert_failed"})
				return
			}
			slotIDs[i] = id
		}
		if err := tx.Commit(ctx); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tx_commit_failed"})
			return
		}
	}
	createdMs = float64(time.Since(t0).Microseconds()) / 1000.0

	t1 := time.Now()
	var okCount, failCount int64

	var wg sync.WaitGroup
	for _, sid := range slotIDs {
		wg.Add(1)
		go func(slotID uuid.UUID) {
			defer wg.Done()
			tx, err := a.Pool.BeginTx(ctx, pgx.TxOptions{})
			if err != nil {
				atomic.AddInt64(&failCount, 1)
				return
			}
			defer func() { _ = tx.Rollback(ctx) }()

			_, err = ReserveConfirmedSlot(ctx, tx, userID, slotID)
			if err != nil {
				atomic.AddInt64(&failCount, 1)
				return
			}
			if err := tx.Commit(ctx); err != nil {
				atomic.AddInt64(&failCount, 1)
				return
			}
			atomic.AddInt64(&okCount, 1)
		}(sid)
	}
	wg.Wait()
	phaseMs = float64(time.Since(t1).Microseconds()) / 1000.0

	t2 := time.Now()
	// Cleanup: reservations first, then slots
	if len(slotIDs) > 0 {
		cleanupCtx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		_, _ = a.Pool.Exec(cleanupCtx, `delete from public.reservations where slot_id = any($1::uuid[])`, slotIDs)
		_, _ = a.Pool.Exec(cleanupCtx, `delete from public.slots where id = any($1::uuid[])`, slotIDs)
	}
	cleanMs = float64(time.Since(t2).Microseconds()) / 1000.0

	totalMs := float64(time.Since(t0).Microseconds()) / 1000.0

	note := "Goroutines are cheap, but Postgres connections are not: pgxpool keeps a bounded pool (see db_max_conns). " +
		"Each simulated booking calls Pool.BeginTx, which Acquire()s a connection from the pool; if every connection is busy, extra goroutines block until Commit/Rollback returns a conn. " +
		"So N goroutines does not mean N simultaneous DB sessions — at most MaxConns transactions run at once; the rest queue in the pool. " +
		"Behind that, Supabase’s pooler has its own client/backend limits; size DB_MAX_CONNS to your tier."

	writeJSON(w, http.StatusOK, BenchmarkBookingRushResponse{
		N:                 n,
		ResourceID:        body.ResourceID.String(),
		SlotsCreatedMs:    createdMs,
		ConcurrentPhaseMs: phaseMs,
		CleanupMs:         cleanMs,
		TotalMs:           totalMs,
		ReservationsOK:    okCount,
		ReservationsFail:  failCount,
		DBMaxConns:        a.Pool.Config().MaxConns,
		AllowedMaxN:       allowed,
		Note:              note,
	})
}

func (a *API) effectiveBenchmarkLimits(r *http.Request) (allowed int, hardMax int) {
	hardMax = a.BenchmarkHardMaxN
	if hardMax < 1 {
		hardMax = 10000
	}
	allowed = a.BenchmarkMaxN
	if allowed < 1 {
		allowed = 10000
	}

	secret := strings.TrimSpace(a.BenchmarkSecret)
	if secret != "" {
		got := strings.TrimSpace(r.Header.Get("X-Benchmark-Key"))
		if subtle.ConstantTimeCompare([]byte(got), []byte(secret)) == 1 {
			// Stress-test ceiling (e.g. 10_000); still bounded by BENCHMARK_HARD_MAX_N.
			return hardMax, hardMax
		}
	}
	const publicCap = 10000
	if allowed > publicCap {
		allowed = publicCap
	}
	return allowed, hardMax
}
