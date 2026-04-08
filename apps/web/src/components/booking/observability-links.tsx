"use client";

import {
  ObservabilityNavButtons,
  showObservabilityNav,
} from "@/components/observability-nav-buttons";

export function ObservabilityLinks() {
  if (!showObservabilityNav()) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-emerald-500/10 bg-white/50 p-4 shadow-sm backdrop-blur-sm dark:bg-white/[0.04]">
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
        <span className="font-medium text-emerald-950 dark:text-emerald-100/90">
          Observability
        </span>
        {" — "}
        The buttons below open{" "}
        <span className="font-medium text-foreground">new browser tabs</span>{" "}
        (Grafana, Prometheus, or raw API metrics). You can keep this booking page
        open while you explore them.
      </p>
      <div className="flex flex-wrap gap-2">
        <ObservabilityNavButtons variant="card" />
      </div>
    </div>
  );
}
