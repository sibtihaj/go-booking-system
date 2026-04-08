package handlers

import (
	"net/http"
	"testing"
)

func TestMimicStatusFromSeq_distribution(t *testing.T) {
	t.Parallel()
	var ok, other int
	for seq := 0; seq < 230; seq++ {
		switch MimicStatusFromSeq(seq) {
		case http.StatusOK:
			ok++
		case http.StatusTooManyRequests, http.StatusBadGateway:
			other++
		default:
			t.Fatalf("unexpected status for seq=%d", seq)
		}
	}
	if ok == 0 || other == 0 {
		t.Fatalf("expected mix of 200 and non-200, got ok=%d other=%d", ok, other)
	}
}
