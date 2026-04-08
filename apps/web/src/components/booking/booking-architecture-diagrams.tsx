"use client";

import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";
import { useTheme } from "next-themes";
import {
  bookingFetchFlowMermaid,
  bookingReservationFlowMermaid,
  bookingSlotCreateFlowMermaid,
} from "@/content/booking-flows.mmd";
import { cn } from "@/lib/utils";

function applyMermaidTheme(isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    flowchart: {
      curve: "bumpX",
      padding: 20,
      nodeSpacing: 48,
      rankSpacing: 64,
      useMaxWidth: true,
      htmlLabels: true,
    },
    themeVariables: isDark
      ? {
          primaryColor: "#064e3b",
          primaryTextColor: "#ecfdf5",
          primaryBorderColor: "#10b981",
          lineColor: "#5eead4",
          secondaryColor: "#115e59",
          tertiaryColor: "#042f2e",
          background: "transparent",
          mainBkg: "transparent",
          nodeBorder: "#10b981",
          clusterBkg: "rgba(6, 78, 59, 0.12)",
          clusterBorder: "#059669",
          titleColor: "#a7f3d0",
          edgeLabelBackground: "#020617",
          fontFamily: "var(--font-sans)",
          fontSize: "12px",
        }
      : {
          primaryColor: "#f0fdf4",
          primaryTextColor: "#064e3b",
          primaryBorderColor: "#059669",
          lineColor: "#0d9488",
          secondaryColor: "#f0f9ff",
          tertiaryColor: "#fdf2f8",
          background: "transparent",
          mainBkg: "transparent",
          nodeBorder: "#059669",
          clusterBkg: "rgba(240, 253, 244, 0.45)",
          clusterBorder: "#10b981",
          titleColor: "#064e3b",
          edgeLabelBackground: "#ffffff",
          fontFamily: "var(--font-sans)",
          fontSize: "12px",
        },
  });
}

const SECTIONS = [
  {
    id: "reserve",
    title: "Making a reservation",
    description:
      "You click Reserve: the browser sends POST /api/v1/reservations with a Supabase access token. The Go API verifies the JWT against the Auth issuer, then runs a single Postgres transaction (lock slot row, insert reservation, commit).",
    source: bookingReservationFlowMermaid,
  },
  {
    id: "fetch",
    title: "Fetching booking data",
    description:
      "Loading the page calls GET /availability (open slots for a resource) and GET /reservations (your confirmed rows). Both require Bearer JWT; the Go handlers query Postgres — no SQL from the browser.",
    source: bookingFetchFlowMermaid,
  },
  {
    id: "slot-create",
    title: "Creating a slot",
    description:
      "Adding availability sends POST /api/v1/slots with start/end times. If SLOT_CREATE_SECRET is set on the API, the same request must include X-Slot-Admin-Key. Go inserts into public.slots; duplicates return 409.",
    source: bookingSlotCreateFlowMermaid,
  },
] as const;

export function BookingArchitectureDiagrams({
  className,
  hideSourceFooter = false,
}: {
  className?: string;
  /** Hide the small source path line when the accordion already cites the file. */
  hideSourceFooter?: boolean;
}) {
  const instanceId = useId().replace(/:/g, "");
  const { resolvedTheme } = useTheme();
  const [svgs, setSvgs] = useState<(string | null)[]>(() =>
    SECTIONS.map(() => null),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isDark = resolvedTheme === "dark";
    applyMermaidTheme(isDark);
    let cancelled = false;

    void (async () => {
      try {
        const prefix = `booking-flow-${instanceId}-${isDark ? "d" : "l"}`;
        const outs = await Promise.all(
          SECTIONS.map((s, i) =>
            mermaid.render(`${prefix}-${s.id}-${i}`, s.source),
          ),
        );
        if (!cancelled) {
          setSvgs(outs.map((o) => o.svg));
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not render diagrams.");
          setSvgs(SECTIONS.map(() => null));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [instanceId, resolvedTheme]);

  if (error) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive",
          className,
        )}
        role="alert"
      >
        {error}
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-10", className)}>
      {SECTIONS.map((section, i) => (
        <div key={section.id} className="space-y-3">
          <div className="px-1">
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-900/55 dark:text-emerald-100/45">
              {section.title}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {section.description}
            </p>
          </div>
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border border-emerald-500/15 bg-white/50 p-1 dark:border-white/10 dark:bg-black/25",
              "[&_svg]:mx-auto [&_svg]:block [&_svg]:max-w-none",
            )}
          >
            {!svgs[i] ? (
              <div
                className="flex min-h-[200px] items-center justify-center py-12"
                aria-busy="true"
                aria-label={`Loading ${section.title} diagram`}
              >
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent dark:border-emerald-400" />
              </div>
            ) : (
              <div
                className="overflow-x-auto px-2 py-6 md:px-6"
                dangerouslySetInnerHTML={{ __html: svgs[i]! }}
              />
            )}
          </div>
        </div>
      ))}
      {!hideSourceFooter ? (
        <p className="text-center text-[11px] text-muted-foreground">
          Source:{" "}
          <code className="font-mono text-[10px]">apps/web/src/content/booking-flows.mmd.ts</code>
        </p>
      ) : null}
    </div>
  );
}
