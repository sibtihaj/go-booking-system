"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiFetchJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Home, RefreshCcw, CheckCircle2, AlertCircle, BookOpen, ChevronRight, ArrowRight, Activity } from "lucide-react";
import { BookingPipelineTerminal } from "@/components/booking/booking-pipeline-terminal";
import { DbConnectionStatusPill } from "@/components/booking/db-connection-status";
import {
  BookingExtras,
  type ReservationRow,
} from "@/components/booking/booking-extras";
import { ShowcaseAccordion } from "@/components/showcase/showcase-accordion";
import { bookShowcaseSections } from "@/content/showcase";
import { BookingConcurrencyLab } from "@/components/booking/booking-concurrency-lab";
import { cn } from "@/lib/utils";

type Slot = {
  id: string;
  resource_id: string;
  starts_at: string;
  ends_at: string;
};

type AvailabilityResponse = { slots: Slot[] };

type ReservationsResponse = { reservations: ReservationRow[] };

const demoResourceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type BookingFlowState = {
  slotId: string;
  logs: string[];
  status: "running" | "success" | "error";
  errorDetail?: string;
};

export default function BookPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const resourceId =
    process.env.NEXT_PUBLIC_DEFAULT_RESOURCE_ID?.trim() || demoResourceId;

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingFlow, setBookingFlow] = useState<BookingFlowState | null>(null);
  const [terminalDismissSeconds, setTerminalDismissSeconds] = useState<number | null>(null);

  const dismissBookingTerminal = useCallback(() => {
    setBookingFlow(null);
  }, []);

  useEffect(() => {
    if (
      !bookingFlow ||
      (bookingFlow.status !== "success" && bookingFlow.status !== "error")
    ) {
      setTerminalDismissSeconds(null);
      return;
    }
    setTerminalDismissSeconds(20);
    let remaining = 20;
    const id = window.setInterval(() => {
      remaining -= 1;
      setTerminalDismissSeconds(remaining);
      if (remaining <= 0) {
        window.clearInterval(id);
        setTerminalDismissSeconds(null);
        setBookingFlow(null);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [bookingFlow?.slotId, bookingFlow?.status]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace("/login?next=/book");
        return;
      }
      const token = session.access_token;
      const [availResult, resvResult] = await Promise.allSettled([
        apiFetchJson<AvailabilityResponse>(
          `/api/v1/availability?resource_id=${encodeURIComponent(resourceId)}`,
          token,
        ),
        apiFetchJson<ReservationsResponse>(`/api/v1/reservations`, token),
      ]);

      const unauthorized = [availResult, resvResult].some(
        (r) =>
          r.status === "rejected" &&
          (r.reason as { status?: number })?.status === 401,
      );
      if (unauthorized) {
        toast.error("Session expired — sign in again.");
        router.replace("/login?next=/book");
        return;
      }

      if (availResult.status === "fulfilled") {
        setSlots(availResult.value.slots);
      } else {
        toast.error("Could not load availability.");
        setSlots([]);
      }

      if (resvResult.status === "fulfilled") {
        setReservations(resvResult.value.reservations);
      } else {
        toast.error("Could not load your reservations.");
        setReservations([]);
      }
    } catch {
      toast.error("Could not load booking data.");
      setSlots([]);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [resourceId, router, supabase.auth]);

  useEffect(() => {
    void load();
  }, [load]);

  function appendBookingLog(slotId: string, line: string) {
    setBookingFlow((prev) => {
      if (!prev || prev.slotId !== slotId) return prev;
      return { ...prev, logs: [...prev.logs, line] };
    });
  }

  async function reserveWithLogs(slotId: string) {
    const add = async (line: string, pause = 90) => {
      appendBookingLog(slotId, line);
      await sleep(pause + Math.floor(Math.random() * 45));
    };

    setBookingFlow({ slotId, logs: [], status: "running" });
    await sleep(50);

    try {
      await add("[client] Reading Supabase session from browser…", 70);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        await add("[client] ERROR: no access token — sign in required", 80);
        setBookingFlow((prev) =>
          prev && prev.slotId === slotId
            ? {
                ...prev,
                status: "error",
                errorDetail: "No session — redirecting to login.",
              }
            : prev,
        );
        await sleep(2600);
        setBookingFlow(null);
        router.replace("/login?next=/book");
        return;
      }

      const tokPreview = `${session.access_token.slice(0, 8)}…${session.access_token.slice(-4)}`;
      await add(`[client] Authorization: Bearer ${tokPreview}`, 100);
      const base =
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080";
      await add(`[client] POST ${base}/api/v1/reservations`, 85);
      await add(`[client] JSON body: { "slot_id": "${slotId}" }`, 75);
      await add("[api] Verifying JWT (go-oidc, audience=authenticated)…", 100);

      const t0 = Date.now();
      const res = await apiFetchJson<{ id: string; slot_id: string; status: string }>(
        "/api/v1/reservations",
        session.access_token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot_id: slotId }),
        },
      );
      const ms = Date.now() - t0;

      await add(`[api] Response received — ${ms}ms round-trip`, 90);
      await add("[go] BEGIN transaction (pgx)", 70);
      await add("[go] SELECT 1 FROM public.slots WHERE id = $1 FOR UPDATE", 85);
      await add(
        "[go] INSERT INTO public.reservations (slot_id, user_id, status) … ON CONFLICT (slot_id) DO NOTHING RETURNING id",
        100,
      );
      await add(`[go] COMMIT — reservation ${res.id.slice(0, 8)}…`, 80);
      await add(`[api] HTTP 201 Created — status=${res.status}`, 70);

      setBookingFlow((prev) =>
        prev && prev.slotId === slotId ? { ...prev, status: "success" } : prev,
      );

      toast.success("Reservation confirmed", {
        description: "Your slot is secured in the database.",
      });
      await load();
    } catch (err) {
      const status = (err as { status?: number }).status;
      const body = (err as { body?: { error?: string } }).body;
      const code =
        body && typeof body === "object" && body && "error" in body
          ? String((body as { error: string }).error)
          : undefined;
      appendBookingLog(
        slotId,
        `[api] Request failed${typeof status === "number" ? ` — HTTP ${status}` : ""}${code ? ` — ${code}` : ""}`,
      );

      const detail =
        status === 409
          ? "slot_unavailable — another user took this window."
          : status === 404
            ? "slot_not_found."
            : code || "Unexpected error.";

      setBookingFlow((prev) =>
        prev && prev.slotId === slotId
          ? { ...prev, status: "error", errorDetail: detail }
          : prev,
      );

      if (status === 409) {
        toast.error("Slot conflict", {
          description: "That slot was just taken by another user.",
        });
      } else if (status === 404) {
        toast.error("Not found", { description: "That slot no longer exists." });
      } else {
        toast.error("Booking error", {
          description: code || "Request failed.",
        });
      }
      await load();
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const formatTime = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  const formatDate = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
    } catch { return iso; }
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-emerald-500/20">
      {/* Refined Background Architecture */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,_var(--tw-gradient-stops))] from-emerald-50/50 via-transparent to-transparent dark:from-emerald-950/20 pointer-events-none" />
      <div className="fixed top-0 right-0 -z-10 h-[500px] w-[500px] bg-emerald-200/10 blur-[120px] rounded-full dark:bg-emerald-500/5 pointer-events-none" />
      
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16 relative z-10">
        {/* Minimalist Header */}
        <header className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-2"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Live Scheduling</span>
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-emerald-950 dark:text-white sm:text-6xl">
              Book a <span className="text-emerald-500/80">Slot</span>
            </h1>
            <p className="text-base text-muted-foreground/80 max-w-md leading-relaxed">
              Select a time window for resource <code className="bg-emerald-500/5 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300 font-mono text-xs">{resourceId.slice(0, 8)}</code>
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full text-xs font-medium px-4")}>
              <Home className="mr-2 h-3.5 w-3.5" /> Home
            </Link>
            <Link
              href="/how-it-works"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full text-xs font-medium px-4")}
            >
              <BookOpen className="mr-2 h-3.5 w-3.5" /> How it works
            </Link>
            <div className="h-4 w-px bg-emerald-500/10" />
            <Button variant="outline" size="sm" className="rounded-full text-xs font-semibold px-5 border-emerald-500/10 hover:bg-emerald-500/5" onClick={() => void signOut()}>
              <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
            </Button>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-900/40 dark:text-white/40">Available Windows</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-8 px-2 text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-emerald-500/5", loading && "opacity-50")}
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCcw className={cn("mr-2 h-3 w-3", loading && "animate-spin")} />
                {loading ? "Syncing..." : "Refresh"}
              </Button>
            </div>

            <div className="relative">
              {loading && !slots && (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 rounded-3xl border border-emerald-500/5 bg-white/40 dark:bg-white/5 animate-pulse" />
                  ))}
                </div>
              )}

              {!loading && slots?.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 px-8 rounded-3xl border border-dashed border-emerald-500/20 bg-emerald-500/[0.02]"
                >
                  <AlertCircle className="h-10 w-10 text-emerald-500/20 mb-4" />
                  <h3 className="text-lg font-bold text-emerald-950 dark:text-white">No slots found</h3>
                  <p className="text-sm text-muted-foreground mt-1">Try refreshing or check back later.</p>
                </motion.div>
              )}

              <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                  {slots?.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="group relative"
                    >
                      <div className={cn(
                        "relative flex flex-col rounded-[2rem] border transition-all duration-500",
                        "bg-white/60 backdrop-blur-md border-emerald-500/5 hover:border-emerald-500/20 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.1)]",
                        "dark:bg-white/5 dark:border-white/5 dark:hover:border-white/10 dark:hover:bg-white/[0.07]",
                        bookingFlow?.slotId === s.id && "ring-2 ring-emerald-500/50 border-transparent",
                        bookingFlow?.slotId !== s.id &&
                          "flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0"
                      )}>
                        {bookingFlow?.slotId === s.id ? (
                          <div className="p-4 sm:p-5">
                            <BookingPipelineTerminal
                              logs={bookingFlow.logs}
                              status={bookingFlow.status}
                              errorDetail={bookingFlow.errorDetail}
                              onDismiss={dismissBookingTerminal}
                              dismissSecondsRemaining={terminalDismissSeconds}
                            />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-center justify-center min-w-[70px] py-2 px-3 rounded-2xl bg-emerald-500/5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/10">
                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-60">{new Date(s.starts_at).toLocaleDateString([], { weekday: 'short' })}</span>
                                <span className="text-xl font-black tracking-tight leading-none mt-1">{new Date(s.starts_at).getDate()}</span>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl font-bold tracking-tight text-emerald-950 dark:text-white">{formatTime(s.starts_at)}</span>
                                  <ArrowRight className="h-3.5 w-3.5 text-emerald-500/30" />
                                  <span className="text-xl font-bold tracking-tight text-emerald-950 dark:text-white">{formatTime(s.ends_at)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground/60 font-medium">
                                  <span>{new Date(s.starts_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
                                  <span className="h-1 w-1 rounded-full bg-emerald-500/20" />
                                  <span className="font-mono text-[9px] uppercase tracking-widest">{s.id.slice(0, 8)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-6 sm:mt-0">
                              <Button
                                type="button"
                                onClick={() => void reserveWithLogs(s.id)}
                                disabled={bookingFlow !== null}
                                className={cn(
                                  "w-full sm:w-auto h-12 px-8 rounded-2xl font-bold transition-all duration-300",
                                  "bg-emerald-950 text-white hover:bg-emerald-900 shadow-lg shadow-emerald-950/10 hover:shadow-emerald-950/20 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:shadow-emerald-500/10"
                                )}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Reserve Slot
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.4 }}
              className="group relative overflow-hidden rounded-[2.5rem] border border-emerald-500/10 bg-white/60 p-8 shadow-sm backdrop-blur-md dark:bg-white/[0.04]"
            >
              {/* Subtle background glow */}
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-[100px] transition-colors group-hover:bg-emerald-500/10" />

              <div className="relative z-10 mb-8 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/10">
                    <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-900/40 dark:text-white/40">
                    Concurrent booking simulation
                  </h2>
                </div>
                
                <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
                  Stress-test the same Go API and transactional path as{" "}
                  <span className="text-emerald-950 dark:text-white font-bold">Reserve Slot</span>: the
                  server creates temporary slots, then starts one goroutine per simulated booking.
                  Those goroutines all call <code className="text-emerald-700 dark:text-emerald-400 font-mono text-xs font-bold">pgxpool.BeginTx</code>
                  — but the pool only keeps a{" "}
                  <span className="text-emerald-950 dark:text-white font-bold">fixed number of real Postgres
                  connections</span>.
                </p>
              </div>

              <BookingConcurrencyLab
                resourceId={resourceId}
                className="border-0 bg-transparent p-0"
              />
            </motion.div>
          </div>

          {/* Sidebar Info */}
          <aside className="lg:col-span-5 space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="p-8 rounded-[2.5rem] bg-emerald-950 text-white dark:bg-emerald-900/40 border border-white/5 shadow-2xl relative overflow-hidden group"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 bg-emerald-500/20 blur-[80px] rounded-full group-hover:bg-emerald-500/30 transition-colors duration-700" />
              
              <div className="relative z-10 space-y-6">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                  <BookOpen className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight">Booking Policy</h3>
                  <p className="text-emerald-100/60 text-sm leading-relaxed">
                    Reservations are processed in real-time by our Go-powered scheduling engine. Once confirmed, your slot is immediately locked.
                  </p>
                </div>
                
                <ul className="space-y-4">
                  {[
                    "Instant database persistence",
                    "JWT-secured API endpoints",
                    "Atomic slot locking",
                    "Real-time conflict detection"
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-medium text-emerald-100/80">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link 
                  href="/how-it-works"
                  className="group/btn inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Learn about the architecture
                  <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          </aside>
        </div>

        <div className="w-full min-w-0">
          <DbConnectionStatusPill />
        </div>

        <BookingExtras
          resourceId={resourceId}
          reservations={reservations}
          onRefresh={() => void load()}
          formatTime={formatTime}
          formatDate={formatDate}
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
          className="w-full min-w-0"
        >
          <ShowcaseAccordion
            title="How does booking work?"
            description="Architecture and implementation: expand each section for diagrams, HTTP flows, and code references in this repo."
            sections={bookShowcaseSections}
            defaultOpenIds={["booking-architecture"]}
            className="w-full"
          />
        </motion.div>
      </div>
    </div>
  );
}
