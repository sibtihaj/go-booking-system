"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetchJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Cpu, Activity, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type BenchmarkResponse = {
  n: number;
  resource_id: string;
  slots_created_ms: number;
  concurrent_phase_ms: number;
  cleanup_ms: number;
  total_ms: number;
  reservations_ok: number;
  reservations_fail: number;
  db_max_conns: number;
  allowed_max_n: number;
  note: string;
};

/** Upper bound for the simulation input; must stay ≤ API public cap (see apps/api/internal/handlers/benchmark.go). */
const MAX_UI = 10_000;

type BookingConcurrencyLabProps = {
  resourceId: string;
  className?: string;
};

export function BookingConcurrencyLab({
  resourceId,
  className,
}: BookingConcurrencyLabProps) {
  const [n, setN] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BenchmarkResponse | null>(null);

  const run = useCallback(async () => {
    const count = Math.floor(Number(n));
    if (!Number.isFinite(count) || count < 1 || count > MAX_UI) {
      toast.error(`Enter a number between 1 and ${MAX_UI}.`);
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Sign in required.");
        return;
      }

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
      setResult(data);
      toast.success("Simulation finished.");
    } catch (e: unknown) {
      const err = e as { status?: number; body?: { error?: string; max_n?: number } };
      if (err.status === 400 && err.body?.error === "n_too_large") {
        toast.error(
          `n too large for this session (max ${String(err.body.max_n ?? "?")}).`,
        );
      } else {
        toast.error("Simulation failed — check API and database.");
      }
    } finally {
      setLoading(false);
    }
  }, [n, resourceId]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="relative overflow-hidden rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 p-6">
        {/* Decorative background pulse */}
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl" />
        
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10">
                <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Label htmlFor="bench-n" className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-900/60 dark:text-emerald-400/60">
                Simulation Intensity
              </Label>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative group">
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
                  className="h-12 w-36 min-w-[9rem] rounded-xl border-emerald-500/10 bg-white/50 px-4 font-mono text-lg font-bold transition-all focus:ring-2 focus:ring-emerald-500/20 dark:bg-black/20 [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  disabled={loading}
                />
                <div className="absolute -right-2 -top-2 scale-0 opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
                  <Badge variant="secondary" className="bg-emerald-100 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    {n > 2000 ? "HIGH LOAD" : "NORMAL"}
                  </Badge>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="h-1.5 w-full rounded-full bg-emerald-500/10 overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(n / MAX_UI) * 100}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={() => void run()}
            disabled={loading}
            className={cn(
              "h-12 min-w-[160px] cursor-pointer rounded-xl font-bold transition-all duration-300 shadow-lg disabled:cursor-not-allowed",
              loading 
                ? "bg-emerald-100 text-emerald-400 dark:bg-emerald-900/20" 
                : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20 hover:shadow-emerald-600/40"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4 fill-current" />
                Run Simulation
              </>
            )}
          </Button>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-white/40 p-3 text-[11px] leading-relaxed text-muted-foreground/80 dark:bg-black/20">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500/50" />
          <p>
            Same reserve logic as production. Results include <code className="font-mono font-bold text-emerald-700 dark:text-emerald-400">db_max_conns</code>. 
            Work queues on the pool when goroutines exceed connection count. Browser cap {MAX_UI}.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="rounded-2xl border border-emerald-500/10 bg-white/40 p-5 dark:bg-white/5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Throughput</span>
                <Cpu className="h-3.5 w-3.5 text-emerald-500/40" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">Success</p>
                  <p className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">{result.reservations_ok}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">Failed</p>
                  <p className="text-2xl font-black tracking-tight text-red-500/80">{result.reservations_fail}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-emerald-500/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Pool Width</span>
                <span className="font-mono text-xs font-bold">{result.db_max_conns} conns</span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/10 bg-white/40 p-5 dark:bg-white/5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Latency</span>
                <Zap className="h-3.5 w-3.5 text-emerald-500/40" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">Concurrent Phase</span>
                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{result.concurrent_phase_ms.toFixed(1)}ms</span>
                </div>
                <div className="h-1 w-full rounded-full bg-emerald-500/5 overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500/40"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                  <span>Total Roundtrip</span>
                  <span>{result.total_ms.toFixed(1)}ms</span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 rounded-xl bg-emerald-950/5 p-3 dark:bg-white/5 border border-emerald-500/5">
              <p className="text-[10px] leading-relaxed text-muted-foreground italic">
                &ldquo;{result.note}&rdquo;
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
