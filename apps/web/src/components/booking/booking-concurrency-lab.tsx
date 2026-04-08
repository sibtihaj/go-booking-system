"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetchJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Cpu, Activity, Info, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { fetchGoGoroutinesFromMetrics } from "@/lib/prometheus-text";
import {
  ObservabilityNavButtons,
  showObservabilityNav,
} from "@/components/observability-nav-buttons";

type BenchmarkResponse = {
  n: number;
  resource_id: string;
  slots_created_ms: number;
  concurrent_phase_ms: number;
  cleanup_ms: number;
  total_ms: number;
  reservations_ok: number;
  reservations_fail: number;
  server_peak_goroutines?: number;
  db_max_conns: number;
  allowed_max_n: number;
  note: string;
  mimic_dispatch_enabled?: boolean;
  mimic_auth_header_present?: boolean;
  mimic_email_total?: number;
  mimic_whatsapp_total?: number;
  /** Counts per HTTP status (or client_error) for demo mimic email POSTs after each successful commit. */
  mimic_email_by_code?: Record<string, number>;
  /** Counts per HTTP status for demo mimic WhatsApp POSTs. */
  mimic_whatsapp_by_code?: Record<string, number>;
};

/** Upper bound for the simulation input; must stay ≤ API public cap (see apps/api/internal/handlers/benchmark.go). */
const MAX_UI = 10_000;

type LogEntry = {
  id: string;
  ts: string;
  line: string;
};

type RunState = "idle" | "running" | "succeeded" | "failed";

type BookingConcurrencyLabProps = {
  resourceId: string;
  className?: string;
};

type SimulationSnapshot = {
  runAtIso: string;
  status: "succeeded" | "failed";
  n: number;
  reservationsOk?: number;
  reservationsFail?: number;
  totalMs?: number;
  concurrentMs?: number;
  cleanupMs?: number;
  mimicEmailByCode?: Record<string, number>;
  mimicWhatsappByCode?: Record<string, number>;
  serverPeakGoroutines?: number;
  mimicDispatchEnabled?: boolean;
  mimicAuthHeaderPresent?: boolean;
  mimicEmailTotal?: number;
  mimicWhatsappTotal?: number;
  errorDetail?: string;
};

const LAST_SNAPSHOT_KEY = "booking_lab_last_simulation_snapshot";
const LAST_SNAPSHOT_EVENT = "booking-lab:last-snapshot-updated";

function formatLogTime(): string {
  const d = new Date();
  return d.toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatMimicCodeSummary(by: Record<string, number> | undefined): string {
  if (!by || Object.keys(by).length === 0) return "—";
  return Object.entries(by)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([code, count]) => `${code}: ${count}`)
    .join(" · ");
}

function estimateGoMemoryMb(bookings: number): number {
  // Rough demo heuristic: lightweight goroutine scheduling + shared runtime overhead.
  return Math.max(120, Math.round(110 + bookings * 0.03));
}

function estimateNodeMemoryMb(bookings: number): number {
  // Rough demo heuristic: async closures, buffers, queue pressure, and optional worker-thread overhead.
  return Math.max(280, Math.round(260 + bookings * 0.12));
}

function formatMemoryLabel(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

export function BookingConcurrencyLab({
  resourceId,
  className,
}: BookingConcurrencyLabProps) {
  const [n, setN] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BenchmarkResponse | null>(null);

  const [simProgress, setSimProgress] = useState(0);
  const [simLogs, setSimLogs] = useState<LogEntry[]>([]);
  const [runState, setRunState] = useState<RunState>("idle");

  const timersRef = useRef<{ intervalId: ReturnType<typeof setInterval> | null; timeouts: ReturnType<typeof setTimeout>[] }>({
    intervalId: null,
    timeouts: [],
  });
  const milestoneSeenRef = useRef<Set<string>>(new Set());
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const metricsOkRef = useRef(false);

  /** Live go_goroutines from GET /metrics (Prometheus text). */
  const [liveGoroutines, setLiveGoroutines] = useState<number | null>(null);
  const [goroutineBaseline, setGoroutineBaseline] = useState<number | null>(null);
  const [goroutinePeak, setGoroutinePeak] = useState<number | null>(null);
  const [metricsPollError, setMetricsPollError] = useState(false);
  const [metricsPollingActive, setMetricsPollingActive] = useState(false);
  const lastSuccessfulTotalMsRef = useRef<number | null>(null);
  const goMemoryEstimateMb = estimateGoMemoryMb(n);
  const nodeMemoryEstimateMb = estimateNodeMemoryMb(n);

  const clearSimulationTimers = useCallback(() => {
    if (timersRef.current.intervalId !== null) {
      clearInterval(timersRef.current.intervalId);
      timersRef.current.intervalId = null;
    }
    timersRef.current.timeouts.forEach(clearTimeout);
    timersRef.current.timeouts = [];
  }, []);

  const queueTraceReset = useCallback((delayMs = 3000) => {
    const timeoutId = setTimeout(() => {
      setSimProgress(0);
      setSimLogs([]);
      setRunState("idle");
    }, delayMs);
    timersRef.current.timeouts.push(timeoutId);
  }, []);

  const appendLog = useCallback((line: string) => {
    setSimLogs((prev) => [
      ...prev,
      { id: makeId(), ts: formatLogTime(), line },
    ]);
  }, []);

  const resetSimulation = useCallback(() => {
    clearSimulationTimers();
    setLoading(false);
    setMetricsPollingActive(false);
    setResult(null);
    setSimProgress(0);
    setSimLogs([]);
    setRunState("idle");
    setLiveGoroutines(null);
    setGoroutineBaseline(null);
    setGoroutinePeak(null);
    metricsOkRef.current = false;
    setMetricsPollError(false);
    milestoneSeenRef.current = new Set();
    toast.message("Simulation reset");
  }, [clearSimulationTimers]);

  useEffect(() => {
    if (!loading || simLogs.length === 0) return;
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [loading, simLogs.length]);

  useEffect(() => () => clearSimulationTimers(), [clearSimulationTimers]);

  useEffect(() => {
    if (!metricsPollingActive) return;
    let cancelled = false;
    const tick = async () => {
      const n = await fetchGoGoroutinesFromMetrics();
      if (cancelled) return;
      if (n === null) {
        if (!metricsOkRef.current) {
          setMetricsPollError(true);
        }
        return;
      }
      metricsOkRef.current = true;
      setMetricsPollError(false);
      setLiveGoroutines(n);
      setGoroutineBaseline((b) => (b === null ? n : b));
      setGoroutinePeak((p) => (p === null ? n : Math.max(p, n)));
    };
    void tick();
    const id = window.setInterval(() => void tick(), 300);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [metricsPollingActive]);

  const run = useCallback(async () => {
    const count = Math.floor(Number(n));
    if (!Number.isFinite(count) || count < 1 || count > MAX_UI) {
      toast.error(`Enter a number between 1 and ${MAX_UI}.`);
      return;
    }

    clearSimulationTimers();
    milestoneSeenRef.current = new Set();
    setSimLogs([]);
    setSimProgress(0);
    setRunState("running");
    setLiveGoroutines(null);
    setGoroutineBaseline(null);
    setGoroutinePeak(null);
    metricsOkRef.current = false;
    setMetricsPollError(false);
    setLoading(true);
    setMetricsPollingActive(true);
    setResult(null);

    appendLog(
      `[0%] Benchmark queued — n=${count}, resource=${resourceId.slice(0, 8)}…`,
    );

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Sign in required.");
      appendLog("[stopped] No session — sign in required.");
      setRunState("failed");
      setSimProgress(0);
      setLoading(false);
      return;
    }

    appendLog("[5%] Supabase session present — attaching Bearer token to request…");
    setSimProgress(5);

    const startMs = Date.now();
    // Heuristic estimate for perceived run progress; server timings are authoritative when response arrives.
    const estimateMs = Math.min(
      180_000,
      Math.max(
        4_000,
        (lastSuccessfulTotalMsRef.current ?? 0) > 0
          ? Math.round((lastSuccessfulTotalMsRef.current as number) * 1.2)
          : 1_800 + count * 7,
      ),
    );

    const tryMilestone = (key: string, minPct: number, line: string) => {
      if (milestoneSeenRef.current.has(key)) return;
      milestoneSeenRef.current.add(key);
      appendLog(`[${minPct}%] ${line}`);
    };

    timersRef.current.intervalId = setInterval(() => {
      const elapsed = Date.now() - startMs;
      let eased = 8 + (elapsed / estimateMs) * 88;
      if (elapsed > estimateMs) {
        const tail = (elapsed - estimateMs) / (estimateMs * 1.4);
        eased = 96 + Math.min(3, tail * 3);
      }
      eased = Math.min(99, eased);
      setSimProgress((prev) => Math.max(prev, eased));

      if (eased >= 10) tryMilestone("post", 10, "Authenticated — POST /api/v1/benchmark/booking-rush");
      if (eased >= 18)
        tryMilestone(
          "slots",
          18,
          `Server: batch-inserting ${count} slot rows (single transaction, unique time windows)…`,
        );
      if (eased >= 32)
        tryMilestone(
          "goroutines",
          32,
          `Server: concurrent phase — ${count} goroutines calling the same reserve path as production…`,
        );
      if (eased >= 46)
        tryMilestone(
          "pool",
          46,
          "pgx pool: limited connections — extra goroutines block on Acquire until a conn is free…",
        );
      if (eased >= 60)
        tryMilestone(
          "tx",
          60,
          "Database: row locks on slots / unique reservation per slot (SERIALIZABLE-style contention)…",
        );
      if (eased >= 74)
        tryMilestone("cleanup", 74, "Server: cleanup — deleting benchmark slots and reservations…");
      if (eased >= 86) tryMilestone("json", 86, "Serializing JSON timings and outcome counts…");
      if (eased >= 95) {
        tryMilestone(
          "finalizing",
          95,
          "Finalizing response (including mimic notification calls and metric flush)…",
        );
      }
    }, 180);

    try {
      const data = await apiFetchJson<BenchmarkResponse>(
        "/api/v1/benchmark/booking-rush",
        session.access_token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            n: count,
            resource_id: resourceId,
          }),
        },
      );

      clearSimulationTimers();
      setSimProgress(100);
      setRunState("succeeded");
      appendLog(
        `[100%] Response received — ok=${data.reservations_ok}, fail=${data.reservations_fail}, total=${data.total_ms.toFixed(1)}ms (slots ${data.slots_created_ms.toFixed(1)}ms · concurrent ${data.concurrent_phase_ms.toFixed(1)}ms · cleanup ${data.cleanup_ms.toFixed(1)}ms)`,
      );
      lastSuccessfulTotalMsRef.current = data.total_ms;
      setResult(data);
      const snapshot: SimulationSnapshot = {
        runAtIso: new Date().toISOString(),
        status: "succeeded",
        n: data.n,
        reservationsOk: data.reservations_ok,
        reservationsFail: data.reservations_fail,
        totalMs: data.total_ms,
        concurrentMs: data.concurrent_phase_ms,
        cleanupMs: data.cleanup_ms,
        serverPeakGoroutines: data.server_peak_goroutines,
        mimicDispatchEnabled: data.mimic_dispatch_enabled,
        mimicAuthHeaderPresent: data.mimic_auth_header_present,
        mimicEmailTotal: data.mimic_email_total,
        mimicWhatsappTotal: data.mimic_whatsapp_total,
        mimicEmailByCode: data.mimic_email_by_code,
        mimicWhatsappByCode: data.mimic_whatsapp_by_code,
      };
      window.dispatchEvent(new CustomEvent<SimulationSnapshot>(LAST_SNAPSHOT_EVENT, { detail: snapshot }));
      try {
        window.localStorage.setItem(LAST_SNAPSHOT_KEY, JSON.stringify(snapshot));
      } catch {
        // Ignore storage quota/browser restrictions.
      }
      toast.success("Simulation finished.");
      queueTraceReset(5000);
    } catch (e: unknown) {
      clearSimulationTimers();
      setRunState("failed");
      setSimProgress(100);
      const err = e as { status?: number; body?: { error?: string; max_n?: number } };
      if (err.status === 400 && err.body?.error === "n_too_large") {
        appendLog(
          `[error] n too large for this session (max ${String(err.body.max_n ?? "?")}).`,
        );
        toast.error(
          `n too large for this session (max ${String(err.body.max_n ?? "?")}).`,
        );
      } else {
        appendLog("[error] Request failed — check API, database, and network.");
        toast.error("Simulation failed — check API and database.");
      }
      const errorDetail =
        err.status === 400 && err.body?.error === "n_too_large"
          ? `n too large for this session (max ${String(err.body.max_n ?? "?")})`
          : "Request failed";
      const snapshot: SimulationSnapshot = {
        runAtIso: new Date().toISOString(),
        status: "failed",
        n: count,
        errorDetail,
      };
      window.dispatchEvent(new CustomEvent<SimulationSnapshot>(LAST_SNAPSHOT_EVENT, { detail: snapshot }));
      try {
        window.localStorage.setItem(LAST_SNAPSHOT_KEY, JSON.stringify(snapshot));
      } catch {
        // Ignore storage quota/browser restrictions.
      }
      queueTraceReset(3500);
    } finally {
      setLoading(false);
      clearSimulationTimers();
      const timeoutId = setTimeout(() => setMetricsPollingActive(false), 4500);
      timersRef.current.timeouts.push(timeoutId);
    }
  }, [n, resourceId, appendLog, clearSimulationTimers, queueTraceReset]);

  return (
    <div className={cn("space-y-8", className)}>
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.04] p-6 sm:p-8 lg:p-8">
        <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15">
                <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Label
                htmlFor="bench-n"
                className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/65 dark:text-emerald-300/70"
              >
                Simulation intensity
              </Label>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="group relative">
                <Input
                  id="bench-n"
                  type="number"
                  min={1}
                  max={MAX_UI}
                  value={n}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") return;
                    const v = Math.floor(Number(raw));
                    if (!Number.isFinite(v)) return;
                    setN(Math.min(MAX_UI, Math.max(1, v)));
                  }}
                  className="h-14 w-40 min-w-[10rem] rounded-2xl border-emerald-500/15 bg-white/70 px-5 font-mono text-2xl font-bold tabular-nums shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/25 dark:bg-black/30 dark:focus-visible:ring-emerald-400/30 [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  disabled={loading}
                  aria-describedby="bench-n-hint"
                />
                <div className="absolute -right-1 -top-1 scale-0 opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                  >
                    {n > 2000 ? "HIGH LOAD" : "NORMAL"}
                  </Badge>
                </div>
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Load vs max ({MAX_UI.toLocaleString()})</span>
                  <span className="font-mono tabular-nums text-foreground/80">{Math.round((n / MAX_UI) * 100)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-500/15">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(n / MAX_UI) * 100}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
            <p id="bench-n-hint" className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">n</span> is the{" "}
              <strong className="text-emerald-950 dark:text-emerald-100">
                actual number of bookings
              </strong>{" "}
              pushed through the Go booking pipeline for this run (concurrent reservation attempts on fresh
              slots). Each successful DB commit triggers demo{" "}
              <code className="rounded bg-emerald-500/10 px-1 py-px font-mono text-xs">
                mimic/email
              </code>{" "}
              and{" "}
              <code className="rounded bg-emerald-500/10 px-1 py-px font-mono text-xs">
                mimic/whatsapp
              </code>{" "}
              calls—no real messages.
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <Button
              type="button"
              size="lg"
              onClick={() => void run()}
              disabled={loading}
              className={cn(
                "h-14 min-w-[12rem] cursor-pointer rounded-2xl px-8 font-display text-base font-semibold shadow-lg transition-all duration-300 disabled:cursor-not-allowed",
                loading
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                  : "bg-emerald-600 text-white shadow-emerald-600/25 hover:bg-emerald-500 hover:shadow-emerald-600/40",
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4 fill-current" />
                  Run Simulation
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetSimulation}
              disabled={loading && runState === "running"}
              className="h-12 min-w-[12rem] rounded-2xl border-emerald-500/20 bg-white/65 text-sm font-semibold text-emerald-900 hover:bg-emerald-500/[0.08] dark:bg-black/20 dark:text-emerald-100"
            >
              Reset simulation
            </Button>
          </div>
        </div>

        {showObservabilityNav() && (
          <div className="relative z-10 mt-6 rounded-2xl border border-emerald-500/12 bg-white/45 p-4 dark:bg-white/[0.03]">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
              Observability shortcuts (open in new tabs)
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Grafana login (demo): <span className="font-mono font-semibold text-foreground">admin</span> /{" "}
              <span className="font-mono font-semibold text-foreground">admin</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <ObservabilityNavButtons variant="card" />
            </div>
          </div>
        )}

        <AnimatePresence>
          {(loading || simLogs.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="relative z-10 mt-8 overflow-hidden"
            >
              <div className="grid gap-6 xl:grid-cols-2 xl:gap-8">
                <div className="min-w-0 flex h-full flex-col gap-4">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-emerald-900/85 dark:text-emerald-100/90">
                    <span className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 shrink-0 opacity-75" />
                      {loading
                        ? "Live progress (estimated until the API responds)"
                        : runState === "failed"
                          ? "Run finished with errors"
                          : runState === "succeeded"
                            ? "Run completed"
                            : "Last run trace"}
                    </span>
                    <span className="font-mono text-base tabular-nums text-emerald-600 dark:text-emerald-400">
                      {`${Math.min(100, simProgress).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/10">
                    <motion.div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500",
                        !loading && simProgress >= 100 && "opacity-90",
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, simProgress)}%` }}
                      transition={{ type: "tween", duration: 0.2 }}
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {loading
                      ? "Client-side model of the benchmark (slots → concurrent reserves → cleanup); jumps to 100% when the API returns."
                      : "Trace clears when you start another run."}
                  </p>

                  <div
                    className="h-[360px] overflow-y-auto rounded-2xl border border-emerald-500/15 bg-emerald-950/[0.04] p-4 font-mono text-xs leading-relaxed text-emerald-950/95 shadow-inner xl:h-[500px] dark:bg-black/35 dark:text-emerald-100/90"
                    role="log"
                    aria-live="polite"
                    aria-relevant="additions"
                  >
                    {simLogs.map((entry) => (
                      <div
                        key={entry.id}
                        className="border-b border-emerald-500/5 py-1.5 last:border-0"
                      >
                        <span className="mr-2 text-emerald-600/75 dark:text-emerald-500/85">
                          {entry.ts}
                        </span>
                        <span className="break-words">{entry.line}</span>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </div>

                <div
                  className="relative flex flex-col overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-cyan-500/[0.03] p-8 dark:border-cyan-500/10 dark:bg-cyan-950/20"
                  aria-live="polite"
                >
                  {/* Decorative Background Elements */}
                  <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none" />
                  <div className="absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-emerald-500/5 blur-[60px] pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-10">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-900/60 dark:text-cyan-400/60">
                          Live Telemetry
                        </p>
                        <h3 className="font-display text-lg font-bold tracking-tight text-cyan-950 dark:text-cyan-50">
                          Go Goroutines
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                        <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">Real-time</span>
                      </div>
                    </div>

                    {metricsPollError && liveGoroutines === null ? (
                      <div className="flex-1 flex items-center justify-center p-8 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                        <p className="text-sm text-center leading-relaxed text-amber-800 dark:text-amber-400">
                          Telemetry unavailable. Ensure <code className="font-mono text-xs">/metrics</code> is accessible.
                        </p>
                      </div>
                    ) : (
                      <div className="flex-1 grid grid-cols-2 gap-5">
                        <div className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-cyan-500/15 bg-white/35 p-5 dark:bg-cyan-950/20">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Current</p>
                          <span className="font-display text-5xl font-extrabold tabular-nums tracking-tight text-cyan-600 dark:text-cyan-400">
                            {loading && liveGoroutines === null ? "—" : liveGoroutines ?? "0"}
                          </span>
                        </div>

                        <div className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-cyan-500/15 bg-white/35 p-5 dark:bg-cyan-950/20">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Baseline</p>
                          <span className="font-display text-5xl font-extrabold tabular-nums tracking-tight text-foreground/75">
                            {goroutineBaseline ?? "0"}
                          </span>
                        </div>

                        <div className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-cyan-500/15 bg-white/35 p-5 dark:bg-cyan-950/20">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Variance</p>
                          <span
                            className={cn(
                              "font-display text-5xl font-extrabold tabular-nums tracking-tight",
                              liveGoroutines !== null && goroutineBaseline !== null && liveGoroutines > goroutineBaseline
                                ? "text-cyan-600 dark:text-cyan-400"
                                : "text-foreground/75",
                            )}
                          >
                            {liveGoroutines !== null && goroutineBaseline !== null ? (
                              <>
                                {liveGoroutines >= goroutineBaseline ? "+" : ""}
                                {liveGoroutines - goroutineBaseline}
                              </>
                            ) : "0"}
                          </span>
                        </div>

                        <div className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-cyan-500/15 bg-white/35 p-5 dark:bg-cyan-950/20">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Peak</p>
                          <span className="font-display text-5xl font-extrabold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                            {goroutinePeak ?? "0"}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="mt-12 pt-6 border-t border-cyan-500/10">
                      <div className="flex items-start gap-3">
                        <Info className="h-3.5 w-3.5 mt-0.5 text-cyan-500/40 shrink-0" />
                        <p className="text-[11px] leading-relaxed text-muted-foreground/80 italic">
                          Process-wide goroutine count. During concurrency, the server spawns{" "}
                          <span className="font-bold text-cyan-900/80 dark:text-cyan-100/80 not-italic">one goroutine per simulated booking</span>.
                          Expect a burst, then a rapid drop after cleanup.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-emerald-500/10 bg-white/50 p-4 text-sm leading-relaxed text-muted-foreground dark:bg-black/25">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500/60" />
          <div className="space-y-2">
            <p>
              <span className="font-semibold text-emerald-950 dark:text-emerald-100">For {n.toLocaleString()} parallel booking attempts:</span>{" "}
              a Go-style worker model is typically around{" "}
              <strong className="text-emerald-900 dark:text-emerald-200">{formatMemoryLabel(goMemoryEstimateMb)}</strong>{" "}
              runtime memory in this demo profile, while a Node.js-only architecture handling the same burst
              (Promises, queue pressure, and optional worker-thread fan-out) is typically closer to{" "}
              <strong className="text-emerald-900 dark:text-emerald-200">{formatMemoryLabel(nodeMemoryEstimateMb)}</strong>.
            </p>
            <p>
              Even with higher DB pool sizes in Node.js, common drawbacks under heavy bursts are: event-loop
              backpressure, slower tail latency as in-flight objects accumulate, and higher memory per
              concurrent unit of work. This comparison is{" "}
              <span className="font-medium text-foreground">an architectural estimate, not a measured benchmark</span>.
              Your real numbers depend on payload size, logging, retries, and deployment tier.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid gap-5 sm:grid-cols-2 lg:gap-6"
          >
            <div className="rounded-2xl border border-emerald-500/10 bg-white/50 p-6 dark:bg-white/[0.06]">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Throughput
                </span>
                <Cpu className="h-4 w-4 text-emerald-500/45" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-muted-foreground/70">Success</p>
                  <p className="font-display text-3xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                    {result.reservations_ok}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-muted-foreground/70">Failed</p>
                  <p className="font-display text-3xl font-bold tabular-nums tracking-tight text-red-500/85">
                    {result.reservations_fail}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-emerald-500/5 pt-4">
                <div className="flex w-full items-center justify-between gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                  <span>Pool width</span>
                  <span className="font-mono text-sm font-bold normal-case text-foreground">{result.db_max_conns} conns</span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-emerald-500/5 pt-2">
                <div className="flex w-full items-center justify-between gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                  <span>Server peak goroutines</span>
                  <span className="font-mono text-sm font-bold normal-case text-foreground">
                    {typeof result.server_peak_goroutines === "number"
                      ? result.server_peak_goroutines
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/10 bg-white/50 p-6 dark:bg-white/[0.06]">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Latency
                </span>
                <Zap className="h-4 w-4 text-emerald-500/45" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Concurrent phase</span>
                  <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {result.concurrent_phase_ms.toFixed(1)}ms
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-500/10">
                  <motion.div
                    className="h-full bg-emerald-500/45"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground/75">
                  <span>Total round-trip</span>
                  <span className="font-mono font-semibold">{result.total_ms.toFixed(1)}ms</span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.08] p-5 dark:bg-sky-950/30">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-900/75 dark:text-sky-300/85">
                  Mimic email (HTTP status mix)
                </p>
                <p className="mb-2 font-mono text-base font-bold text-foreground/95">
                  Total: {result.mimic_email_total ?? 0}
                </p>
                <p className="font-mono text-sm leading-relaxed text-foreground/95">
                  {formatMimicCodeSummary(result.mimic_email_by_code)}
                </p>
              </div>
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.08] p-5 dark:bg-violet-950/30">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-900/75 dark:text-violet-300/85">
                  Mimic WhatsApp (HTTP status mix)
                </p>
                <p className="mb-2 font-mono text-base font-bold text-foreground/95">
                  Total: {result.mimic_whatsapp_total ?? 0}
                </p>
                <p className="font-mono text-sm leading-relaxed text-foreground/95">
                  {formatMimicCodeSummary(result.mimic_whatsapp_by_code)}
                </p>
              </div>
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-emerald-500/10 bg-emerald-950/[0.06] p-4 dark:bg-white/[0.04]">
              <p className="mb-2 text-xs font-mono text-muted-foreground">
                mimic_dispatch_enabled={String(result.mimic_dispatch_enabled ?? false)} · mimic_auth_header_present={String(result.mimic_auth_header_present ?? false)}
              </p>
              <p className="text-sm italic leading-relaxed text-muted-foreground">
                &ldquo;{result.note}&rdquo;
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export function LastSimulationSnapshotCard({ className }: { className?: string }) {
  const [lastSnapshot, setLastSnapshot] = useState<SimulationSnapshot | null>(null);

  const applySnapshot = useCallback((snapshot: SimulationSnapshot | null) => {
    setLastSnapshot(snapshot);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAST_SNAPSHOT_KEY);
      if (!raw) return;
      applySnapshot(JSON.parse(raw) as SimulationSnapshot);
    } catch {
      // Ignore storage parse errors.
    }
  }, [applySnapshot]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LAST_SNAPSHOT_KEY || !event.newValue) return;
      try {
        applySnapshot(JSON.parse(event.newValue) as SimulationSnapshot);
      } catch {
        // Ignore malformed data.
      }
    };
    const onSnapshotUpdated = (event: Event) => {
      const custom = event as CustomEvent<SimulationSnapshot>;
      if (!custom.detail) return;
      applySnapshot(custom.detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(LAST_SNAPSHOT_EVENT, onSnapshotUpdated as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LAST_SNAPSHOT_EVENT, onSnapshotUpdated as EventListener);
    };
  }, [applySnapshot]);

  if (!lastSnapshot) {
    return (
      <section className={cn("rounded-2xl border border-emerald-500/15 bg-white/55 p-5 dark:bg-white/[0.05]", className)}>
        <h4 className="font-display text-lg font-semibold tracking-tight text-emerald-950 dark:text-emerald-100">
          Last simulation snapshot
        </h4>
        <p className="mt-2 text-sm text-muted-foreground">
          No simulation has completed yet. Run the benchmark to populate this card.
        </p>
      </section>
    );
  }

  return (
    <section className={cn("rounded-2xl border border-emerald-500/15 bg-white/55 p-5 dark:bg-white/[0.05]", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h4 className="font-display text-lg font-semibold tracking-tight text-emerald-950 dark:text-emerald-100">
            Last simulation snapshot
          </h4>
          <p className="text-xs text-muted-foreground">{new Date(lastSnapshot.runAtIso).toLocaleString()}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
            lastSnapshot.status === "succeeded"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/15 text-red-700 dark:text-red-300",
          )}
        >
          {lastSnapshot.status}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Bookings (n)</p>
          <p className="font-mono text-2xl font-bold tabular-nums">{lastSnapshot.n}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Success / Failed</p>
          <p className="font-mono text-2xl font-bold tabular-nums">
            {lastSnapshot.reservationsOk ?? "—"} / {lastSnapshot.reservationsFail ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Concurrent phase</p>
          <p className="font-mono text-2xl font-bold tabular-nums">
            {typeof lastSnapshot.concurrentMs === "number" ? `${lastSnapshot.concurrentMs.toFixed(1)}ms` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="font-mono text-2xl font-bold tabular-nums">
            {typeof lastSnapshot.totalMs === "number" ? `${lastSnapshot.totalMs.toFixed(1)}ms` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3 sm:col-span-2 lg:col-span-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Server peak goroutines</p>
          <p className="font-mono text-2xl font-bold tabular-nums">
            {typeof lastSnapshot.serverPeakGoroutines === "number"
              ? lastSnapshot.serverPeakGoroutines
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3 sm:col-span-2 lg:col-span-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Mimic dispatch diagnostics</p>
          <p className="font-mono text-sm leading-relaxed">
            enabled={String(lastSnapshot.mimicDispatchEnabled ?? false)} · auth_header={String(lastSnapshot.mimicAuthHeaderPresent ?? false)} · email_total={lastSnapshot.mimicEmailTotal ?? 0} · whatsapp_total={lastSnapshot.mimicWhatsappTotal ?? 0}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.08] p-3">
          <p className="text-[11px] uppercase tracking-wider text-sky-900/80 dark:text-sky-300/90">
            Mimic email status
          </p>
          <p className="font-mono text-sm">{formatMimicCodeSummary(lastSnapshot.mimicEmailByCode)}</p>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.08] p-3">
          <p className="text-[11px] uppercase tracking-wider text-violet-900/80 dark:text-violet-300/90">
            Mimic WhatsApp status
          </p>
          <p className="font-mono text-sm">{formatMimicCodeSummary(lastSnapshot.mimicWhatsappByCode)}</p>
        </div>
      </div>
      {lastSnapshot.errorDetail && (
        <p className="mt-3 text-xs text-red-700 dark:text-red-300">
          Last run error: {lastSnapshot.errorDetail}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Source: latest benchmark API response in this browser session (persisted in local storage).
      </p>
    </section>
  );
}
