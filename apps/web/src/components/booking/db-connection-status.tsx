"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetchJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type DbStatusPayload = {
  connected: boolean;
  latency_ms: number | null;
};

const POLL_MS = 5000;

function formatLatency(ms: number): string {
  if (ms < 10) return ms.toFixed(2);
  if (ms < 100) return ms.toFixed(1);
  return String(Math.round(ms));
}

export function DbConnectionStatusPill() {
  const supabase = useMemo(() => createClient(), []);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [stale, setStale] = useState(false);

  const poll = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setConnected(null);
        setLatencyMs(null);
        return;
      }
      const data = await apiFetchJson<DbStatusPayload>(
        "/api/v1/db-status",
        session.access_token,
      );
      setConnected(data.connected);
      setLatencyMs(
        typeof data.latency_ms === "number" && !Number.isNaN(data.latency_ms)
          ? data.latency_ms
          : null,
      );
      setStale(false);
    } catch {
      setConnected(false);
      setLatencyMs(null);
      setStale(true);
    }
  }, [supabase.auth]);

  useEffect(() => {
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  const statusLabel =
    connected === null
      ? "Checking database…"
      : connected
        ? "Database connected"
        : stale
          ? "API unreachable"
          : "Database unreachable";

  const latencyLabel =
    connected === true && latencyMs !== null
      ? `Latency: ${formatLatency(latencyMs)} ms`
      : connected === false
        ? "Latency: —"
        : "Latency: …";

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-2 rounded-2xl border-2 px-4 py-3.5 shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3.5",
        "border-emerald-600/25 bg-emerald-50/95 shadow-emerald-900/10",
        "dark:border-emerald-400/35 dark:bg-emerald-950/70 dark:shadow-black/40",
      )}
      role="status"
      aria-live="polite"
      aria-label={`${statusLabel}. ${latencyLabel}. Updated every ${POLL_MS / 1000} seconds.`}
    >
      <div className="flex min-w-0 items-center justify-center gap-2.5 sm:justify-start">
        <span className="relative flex h-3 w-3 shrink-0 items-center justify-center" aria-hidden>
          {connected === true ? (
            <>
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/50 dark:bg-emerald-400/45"
                aria-hidden
              />
              <span
                className={cn(
                  "relative h-2.5 w-2.5 rounded-full ring-2 ring-emerald-500/60 ring-offset-2 ring-offset-emerald-50 animate-pulse",
                  "bg-emerald-600 dark:bg-emerald-400 dark:ring-emerald-400/50 dark:ring-offset-emerald-950",
                )}
              />
            </>
          ) : (
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full ring-2 ring-offset-2 ring-offset-emerald-50 transition-colors dark:ring-offset-emerald-950",
                connected === null && "bg-emerald-400 animate-pulse ring-emerald-400/40",
                connected === false && "bg-amber-500 ring-amber-400/50",
              )}
            />
          )}
        </span>
        <span
          className={cn(
            "text-center text-[11px] font-extrabold uppercase leading-tight tracking-[0.12em] sm:text-left sm:text-xs",
            "text-emerald-950 dark:text-emerald-50",
          )}
        >
          {statusLabel}
        </span>
      </div>
      <span
        className={cn(
          "shrink-0 text-center font-mono text-[11px] font-bold uppercase tracking-[0.08em] tabular-nums sm:text-right sm:text-xs",
          "text-emerald-900 dark:text-emerald-100",
        )}
      >
        {latencyLabel}
      </span>
    </div>
  );
}
