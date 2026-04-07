package auth

import (
	"context"

	"github.com/google/uuid"
)

type ctxKey string

const userIDKey ctxKey = "supabase_user_id"

// WithUserID attaches the Supabase auth user id (JWT sub) to the context.
func WithUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey, id)
}

// UserID returns the authenticated user id or false if missing/invalid.
func UserID(ctx context.Context) (uuid.UUID, bool) {
	v := ctx.Value(userIDKey)
	id, ok := v.(uuid.UUID)
	if !ok || id == uuid.Nil {
		return uuid.Nil, false
	}
	return id, true
}
