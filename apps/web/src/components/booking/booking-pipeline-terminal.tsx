"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Terminal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PipelineStatus = "running" | "success" | "error";

type BookingPipelineTerminalProps = {
  logs: string[];
  status: PipelineStatus;
  errorDetail?: string;
  /** Shown after success or error; closes terminal and returns to slot list. */
  onDismiss?: () => void;
  /** Seconds until auto-close (success / error). */
  dismissSecondsRemaining?: number | null;
};

export function BookingPipelineTerminal({
  logs,
  status,
  errorDetail,
  onDismiss,
  dismissSecondsRemaining,
}: BookingPipelineTerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const showDismiss = (status === "success" || status === "error") && onDismiss;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, status]);

  return (
    <div
      className={cn(
        "flex min-h-[240px] w-full flex-col overflow-hidden rounded-[2rem] border-2 border-emerald-900/20 bg-zinc-950 text-left shadow-inner",
        "dark:border-emerald-500/20",
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/40 px-3 py-2.5 sm:px-4">
        <Terminal className="h-3.5 w-3.5 shrink-0 text-emerald-400/90" strokeWidth={2} />
        <span className="min-w-0 flex-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-emerald-100/80">
          Booking pipeline
        </span>
        {status === "running" ? (
          <span className="font-mono text-[9px] text-amber-400/90">live</span>
        ) : null}
        {showDismiss ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg text-emerald-200/80 hover:bg-white/10 hover:text-white"
            onClick={onDismiss}
            aria-label="Close booking log and return to slots"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="max-h-[280px] flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed text-emerald-100/85 sm:text-[11px]">
        {logs.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            <span className="text-emerald-600/70 dark:text-emerald-500/50">{String(i + 1).padStart(2, "0")}</span>{" "}
            {line}
          </div>
        ))}
        {status === "running" ? (
          <span className="ml-6 inline-block h-3 w-1.5 animate-pulse bg-emerald-400" aria-hidden />
        ) : null}
        <div ref={bottomRef} />
      </div>
      {status === "success" ? (
        <div className="flex items-start gap-2 border-t border-emerald-500/25 bg-emerald-950/80 px-4 py-3 text-sm text-emerald-50">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">Reservation confirmed</p>
            <p className="mt-0.5 text-xs text-emerald-200/80">
              Your slot is locked in Postgres.
              {typeof dismissSecondsRemaining === "number" && dismissSecondsRemaining > 0 ? (
                <>
                  {" "}
                  Auto-closing in{" "}
                  <span className="tabular-nums font-semibold text-emerald-100">
                    {dismissSecondsRemaining}s
                  </span>
                  {" "}
                  — or tap ✕ above.
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}
      {status === "error" ? (
        <div className="border-t border-red-500/30 bg-red-950/50 px-4 py-3 text-xs leading-relaxed text-red-100">
          <p className="font-semibold">Booking did not complete</p>
          {errorDetail ? <p className="mt-1 font-mono text-[10px] opacity-90">{errorDetail}</p> : null}
          <p className="mt-2 text-[10px] text-red-200/80">
            {typeof dismissSecondsRemaining === "number" && dismissSecondsRemaining > 0 ? (
              <>
                Auto-closing in{" "}
                <span className="tabular-nums font-semibold text-red-100">
                  {dismissSecondsRemaining}s
                </span>
                {" "}
                — or tap ✕ above.
              </>
            ) : (
              "Closing…"
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
