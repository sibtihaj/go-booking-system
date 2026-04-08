import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets and observability proxy routes so upstream UIs are not intercepted.
    "/((?!_next/static|_next/image|favicon.ico|booking-api-metrics|grafana-dashboard|prometheus-dashboard|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
