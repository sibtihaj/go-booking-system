"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Activity, BarChart3, ExternalLink, FileJson2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function showObservabilityNav(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_OBSERVABILITY_NAV !== "false";
}

const navLinkClass = cn(
  buttonVariants({
    variant: "ghost",
    className:
      "h-10 gap-1.5 rounded-xl text-emerald-900 hover:bg-emerald-500/10 dark:text-emerald-100",
  }),
);

const cardLinkClass = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "rounded-full border-emerald-500/15 gap-1.5",
);

type ObservabilityNavButtonsProps = {
  variant: "navbar" | "card";
};

/**
 * Grafana, Prometheus, and raw API metrics — opens in new tabs.
 * Use variant="navbar" in SiteHeader; variant="card" on the book page (outline pills).
 */
/** Divider + navbar buttons; omit when observability is disabled. */
export function ObservabilityNavBarGroup() {
  if (!showObservabilityNav()) {
    return null;
  }
  return (
    <>
      <span
        className="hidden h-6 w-px shrink-0 bg-emerald-500/15 sm:block"
        aria-hidden
      />
      <ObservabilityNavButtons variant="navbar" />
    </>
  );
}

export function ObservabilityNavButtons({ variant }: ObservabilityNavButtonsProps) {
  if (!showObservabilityNav()) {
    return null;
  }

  const linkClass = variant === "navbar" ? navLinkClass : cardLinkClass;

  return (
    <>
      <Link
        href="/grafana-dashboard"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        aria-label="Open Grafana in a new tab"
      >
        <BarChart3 className="h-4 w-4 shrink-0" />
        Grafana
        <ExternalLink className="h-3 w-3 shrink-0 opacity-60 sm:h-3.5 sm:w-3.5" aria-hidden />
      </Link>
      <Link
        href="/prometheus-dashboard"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        aria-label="Open Prometheus in a new tab"
      >
        <Activity className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Prometheus</span>
        <span className="sm:hidden">Prom</span>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-60 sm:h-3.5 sm:w-3.5" aria-hidden />
      </Link>
      <Link
        href="/booking-api-metrics"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        aria-label="Open API metrics in a new tab"
      >
        <FileJson2 className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">API metrics</span>
        <span className="sm:hidden">Metrics</span>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-60 sm:h-3.5 sm:w-3.5" aria-hidden />
      </Link>
    </>
  );
}
