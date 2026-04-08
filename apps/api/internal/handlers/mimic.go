package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-booking-system/api/internal/auth"
)

// MimicStatusFromSeq returns a deterministic faux-provider HTTP status for portfolio demos (~87% 200).
func MimicStatusFromSeq(seq int) int {
	switch seq % 23 {
	case 0:
		return http.StatusTooManyRequests // 429
	case 1, 2:
		return http.StatusBadGateway // 502
	default:
		return http.StatusOK
	}
}

type mimicSeqBody struct {
	Seq *int `json:"seq"`
}

func parseMimicSeq(r *http.Request) int {
	var body mimicSeqBody
	if r.Body != nil {
		defer func() { _ = r.Body.Close() }()
		_ = json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&body)
	}
	if body.Seq != nil {
		return *body.Seq
	}
	return 0
}

// MimicEmailPost simulates sending a booking confirmation email (no external provider).
// POST /api/v1/mimic/notification/email — optional JSON {"seq": <int>} for deterministic status mix.
func (a *API) MimicEmailPost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
		return
	}
	if _, ok := auth.UserID(r.Context()); !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	seq := parseMimicSeq(r)
	code := MimicStatusFromSeq(seq)
	if a.Metrics != nil {
		a.Metrics.IncMimicEmail(strconv.Itoa(code))
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"channel": "email",
		"status":  code,
		"ok":      code == http.StatusOK,
	})
}

// MimicWhatsAppPost simulates sending a WhatsApp (or SMS-style) notification after a booking.
// POST /api/v1/mimic/notification/whatsapp — optional JSON {"seq": <int>}.
func (a *API) MimicWhatsAppPost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
		return
	}
	if _, ok := auth.UserID(r.Context()); !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	seq := parseMimicSeq(r)
	// Slightly different mix from email so charts do not overlap perfectly.
	code := MimicStatusFromSeq(seq + 7)
	if a.Metrics != nil {
		a.Metrics.IncMimicWhatsApp(strconv.Itoa(code))
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"channel": "whatsapp",
		"status":  code,
		"ok":      code == http.StatusOK,
	})
}

// postMimicNotification calls this API’s mimic route over HTTP (loopback). Returns response status, or 0 on transport error.
// Uses a detached timeout context so mimic calls are not dropped when the inbound benchmark request context
// is strict or cancelled earlier than the full concurrent phase finishes.
func (a *API) postMimicNotification(authHeader, path string, seq int) int {
	if a == nil || a.MimicHTTPClient == nil || strings.TrimSpace(a.MimicBaseURL) == "" {
		return 0
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	url := strings.TrimRight(a.MimicBaseURL, "/") + path
	payload := fmt.Sprintf(`{"seq":%d}`, seq)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, strings.NewReader(payload))
	if err != nil {
		return 0
	}
	req.Header.Set("Content-Type", "application/json")
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := a.MimicHTTPClient.Do(req)
	if err != nil {
		return 0
	}
	defer func() { _, _ = io.Copy(io.Discard, resp.Body); _ = resp.Body.Close() }()
	return resp.StatusCode
}
