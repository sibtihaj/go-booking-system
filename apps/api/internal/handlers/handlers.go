package handlers

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-booking-system/api/internal/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrSlotNotFound is returned when reserving for a missing slot id.
var ErrSlotNotFound = errors.New("slot_not_found")

// ErrReservationConflict is returned when the slot is already booked (ON CONFLICT no row).
var ErrReservationConflict = errors.New("reservation_conflict")

// API exposes HTTP handlers backed by Postgres.
type API struct {
	Pool *pgxpool.Pool
	// SlotCreateSecret, if non-empty, requires header X-Slot-Admin-Key on POST /slots.
	// If empty, any authenticated user may create slots (demo / trusted environments only).
	SlotCreateSecret string
	// BenchmarkMaxN caps POST /benchmark/booking-rush unless X-Benchmark-Key matches BenchmarkSecret.
	BenchmarkMaxN int
	// BenchmarkHardMaxN is the upper bound when the benchmark key is valid (default 10000).
	BenchmarkHardMaxN int
	BenchmarkSecret   string
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Health returns a simple readiness response (no database check — add if needed).
func (a *API) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// DBStatus runs pool.Ping against Postgres and returns measured round-trip latency (authenticated).
func (a *API) DBStatus(w http.ResponseWriter, r *http.Request) {
	if _, ok := auth.UserID(r.Context()); !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	start := time.Now()
	err := a.Pool.Ping(r.Context())
	latencyMs := float64(time.Since(start).Microseconds()) / 1000.0
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"connected":  false,
			"latency_ms": nil,
			"error":      "ping_failed",
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"connected":  true,
		"latency_ms": latencyMs,
	})
}

// OpenSlot is an available bookable slot returned to clients.
type OpenSlot struct {
	ID         uuid.UUID `json:"id"`
	ResourceID uuid.UUID `json:"resource_id"`
	StartsAt   string    `json:"starts_at"`
	EndsAt     string    `json:"ends_at"`
}

// Availability returns confirmed-unbooked future slots for a resource.
func (a *API) Availability(w http.ResponseWriter, r *http.Request) {
	resourceIDStr := r.URL.Query().Get("resource_id")
	if resourceIDStr == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "resource_id_required"})
		return
	}
	resourceID, err := uuid.Parse(resourceIDStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_resource_id"})
		return
	}

	const q = `
select s.id, s.resource_id, s.starts_at, s.ends_at
from public.slots s
left join public.reservations r
  on r.slot_id = s.id and r.status = 'confirmed'
where s.resource_id = $1
  and r.id is null
  and s.starts_at > now()
order by s.starts_at
limit 200
`

	rows, err := a.Pool.Query(r.Context(), q, resourceID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query_failed"})
		return
	}
	defer rows.Close()

	out := make([]OpenSlot, 0, 32)
	for rows.Next() {
		var row OpenSlot
		var startsAt, endsAt time.Time
		if err := rows.Scan(&row.ID, &row.ResourceID, &startsAt, &endsAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "scan_failed"})
			return
		}
		row.StartsAt = startsAt.UTC().Format(time.RFC3339)
		row.EndsAt = endsAt.UTC().Format(time.RFC3339)
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "rows_failed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"slots": out})
}

// CreateReservationRequest is the JSON body for POST /reservations.
type CreateReservationRequest struct {
	SlotID uuid.UUID `json:"slot_id"`
}

// ReservationResponse is returned after a successful booking.
type ReservationResponse struct {
	ID     uuid.UUID `json:"id"`
	SlotID uuid.UUID `json:"slot_id"`
	Status string    `json:"status"`
}

// ReserveConfirmedSlot runs the same transactional steps as POST /reservations: lock slot row, insert reservation.
func ReserveConfirmedSlot(ctx context.Context, tx pgx.Tx, userID, slotID uuid.UUID) (uuid.UUID, error) {
	const lockSlot = `select 1 from public.slots where id = $1 for update`
	var one int
	if err := tx.QueryRow(ctx, lockSlot, slotID).Scan(&one); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, ErrSlotNotFound
		}
		return uuid.Nil, err
	}

	const insertQ = `
insert into public.reservations (slot_id, user_id, status)
values ($1, $2, 'confirmed')
on conflict (slot_id) do nothing
returning id
`

	var reservationID uuid.UUID
	err := tx.QueryRow(ctx, insertQ, slotID, userID).Scan(&reservationID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, ErrReservationConflict
		}
		return uuid.Nil, err
	}

	return reservationID, nil
}

// CreateReservation books a slot for the authenticated user (idempotent on unique slot_id).
func (a *API) CreateReservation(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var body CreateReservationRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.SlotID == uuid.Nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_body"})
		return
	}

	tx, err := a.Pool.BeginTx(r.Context(), pgx.TxOptions{})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tx_begin_failed"})
		return
	}
	defer func() { _ = tx.Rollback(r.Context()) }()

	reservationID, err := ReserveConfirmedSlot(r.Context(), tx, userID, body.SlotID)
	if err != nil {
		if errors.Is(err, ErrSlotNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "slot_not_found"})
			return
		}
		if errors.Is(err, ErrReservationConflict) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "slot_unavailable"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "reservation_failed"})
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tx_commit_failed"})
		return
	}

	writeJSON(w, http.StatusCreated, ReservationResponse{
		ID:     reservationID,
		SlotID: body.SlotID,
		Status: "confirmed",
	})
}

// ReservationItem is a confirmed booking for the authenticated user with slot times.
type ReservationItem struct {
	ID         uuid.UUID `json:"id"`
	SlotID     uuid.UUID `json:"slot_id"`
	Status     string    `json:"status"`
	ResourceID uuid.UUID `json:"resource_id"`
	StartsAt   string    `json:"starts_at"`
	EndsAt     string    `json:"ends_at"`
}

// ListMyReservations returns confirmed reservations for the JWT subject, newest first.
func (a *API) ListMyReservations(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	const q = `
select r.id, r.slot_id, r.status, s.resource_id, s.starts_at, s.ends_at
from public.reservations r
join public.slots s on s.id = r.slot_id
where r.user_id = $1 and r.status = 'confirmed'
order by s.starts_at desc
limit 100
`

	rows, err := a.Pool.Query(r.Context(), q, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query_failed"})
		return
	}
	defer rows.Close()

	out := make([]ReservationItem, 0, 16)
	for rows.Next() {
		var row ReservationItem
		var startsAt, endsAt time.Time
		if err := rows.Scan(&row.ID, &row.SlotID, &row.Status, &row.ResourceID, &startsAt, &endsAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "scan_failed"})
			return
		}
		row.StartsAt = startsAt.UTC().Format(time.RFC3339)
		row.EndsAt = endsAt.UTC().Format(time.RFC3339)
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "rows_failed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"reservations": out})
}

// CreateSlotRequest is the JSON body for POST /slots.
type CreateSlotRequest struct {
	ResourceID uuid.UUID `json:"resource_id"`
	StartsAt   string    `json:"starts_at"`
	EndsAt     string    `json:"ends_at"`
}

// CreateSlot inserts a bookable window for a resource (admin / operator flow).
func (a *API) CreateSlot(w http.ResponseWriter, r *http.Request) {
	_, ok := auth.UserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	secret := strings.TrimSpace(a.SlotCreateSecret)
	if secret != "" {
		got := strings.TrimSpace(r.Header.Get("X-Slot-Admin-Key"))
		if subtle.ConstantTimeCompare([]byte(got), []byte(secret)) != 1 {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "slot_admin_key_required"})
			return
		}
	}

	var body CreateSlotRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_body"})
		return
	}
	if body.ResourceID == uuid.Nil || body.StartsAt == "" || body.EndsAt == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_body"})
		return
	}

	startsAt, err := time.Parse(time.RFC3339, body.StartsAt)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_starts_at"})
		return
	}
	endsAt, err := time.Parse(time.RFC3339, body.EndsAt)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_ends_at"})
		return
	}
	if !endsAt.After(startsAt) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ends_before_starts"})
	}

	const insertQ = `
insert into public.slots (resource_id, starts_at, ends_at)
values ($1, $2, $3)
returning id, resource_id, starts_at, ends_at
`

	var id, resID uuid.UUID
	var sAt, eAt time.Time
	err = a.Pool.QueryRow(r.Context(), insertQ, body.ResourceID, startsAt.UTC(), endsAt.UTC()).Scan(&id, &resID, &sAt, &eAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "slot_duplicate"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "insert_failed"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"slot": OpenSlot{
			ID:         id,
			ResourceID: resID,
			StartsAt:   sAt.UTC().Format(time.RFC3339),
			EndsAt:     eAt.UTC().Format(time.RFC3339),
		},
	})
}
