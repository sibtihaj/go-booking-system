package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-booking-system/api/internal/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// API exposes HTTP handlers backed by Postgres.
type API struct {
	Pool *pgxpool.Pool
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

	const lockSlot = `select 1 from public.slots where id = $1 for update`
	var one int
	if err := tx.QueryRow(r.Context(), lockSlot, body.SlotID).Scan(&one); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "slot_not_found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "slot_lock_failed"})
		return
	}

	const insertQ = `
insert into public.reservations (slot_id, user_id, status)
values ($1, $2, 'confirmed')
on conflict (slot_id) do nothing
returning id
`

	var reservationID uuid.UUID
	err = tx.QueryRow(r.Context(), insertQ, body.SlotID, userID).Scan(&reservationID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "slot_unavailable"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "insert_failed"})
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
