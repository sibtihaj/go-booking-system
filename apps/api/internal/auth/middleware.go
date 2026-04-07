package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/google/uuid"
)

const bearerPrefix = "bearer "

// JWTVerifier validates Supabase access tokens (audience "authenticated").
type JWTVerifier struct {
	verifier *oidc.IDTokenVerifier
}

// NewJWTVerifier builds an OIDC verifier for Supabase Auth.
func NewJWTVerifier(ctx context.Context, issuerURL string) (*JWTVerifier, error) {
	provider, err := oidc.NewProvider(ctx, issuerURL)
	if err != nil {
		return nil, err
	}
	cfg := &oidc.Config{
		ClientID: "authenticated",
	}
	return &JWTVerifier{verifier: provider.Verifier(cfg)}, nil
}

// Middleware enforces a valid Authorization: Bearer <access_token> header.
func (v *JWTVerifier) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := r.Header.Get("Authorization")
		if len(raw) < len(bearerPrefix) || !strings.EqualFold(raw[:len(bearerPrefix)], bearerPrefix) {
			http.Error(w, `{"error":"missing_bearer_token"}`, http.StatusUnauthorized)
			return
		}
		token := strings.TrimSpace(raw[len(bearerPrefix):])
		if token == "" {
			http.Error(w, `{"error":"missing_bearer_token"}`, http.StatusUnauthorized)
			return
		}

		idToken, err := v.verifier.Verify(r.Context(), token)
		if err != nil {
			http.Error(w, `{"error":"invalid_token"}`, http.StatusUnauthorized)
			return
		}

		var claims struct {
			Sub string `json:"sub"`
		}
		if err := idToken.Claims(&claims); err != nil || claims.Sub == "" {
			http.Error(w, `{"error":"invalid_token_claims"}`, http.StatusUnauthorized)
			return
		}

		userID, err := uuid.Parse(claims.Sub)
		if err != nil {
			http.Error(w, `{"error":"invalid_subject"}`, http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r.WithContext(WithUserID(r.Context(), userID)))
	})
}
