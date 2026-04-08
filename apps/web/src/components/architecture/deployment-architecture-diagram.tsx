"use client";

import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { deploymentArchitectureMermaid } from "@/content/deployment-architecture.mmd";

function applyMermaidTheme(isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    flowchart: {
      curve: "bumpX",
      padding: 24,
      nodeSpacing: 60,
      rankSpacing: 80,
      useMaxWidth: true,
      htmlLabels: true,
    },
    themeVariables: isDark
      ? {
          primaryColor: "#064e3b",
          primaryTextColor: "#ecfdf5",
          primaryBorderColor: "#10b981",
          lineColor: "#67e8f9",
          background: "transparent",
          mainBkg: "transparent",
          clusterBkg: "rgba(6, 78, 59, 0.15)",
          clusterBorder: "#059669",
          titleColor: "#a7f3d0",
          edgeLabelBackground: "#020617",
          fontFamily: "var(--font-sans)",
          fontSize: "13px",
        }
      : {
          primaryColor: "#f0fdf4",
          primaryTextColor: "#064e3b",
          primaryBorderColor: "#059669",
          lineColor: "#0d9488",
          background: "transparent",
          mainBkg: "transparent",
          clusterBkg: "rgba(240, 253, 244, 0.5)",
          clusterBorder: "#10b981",
          titleColor: "#064e3b",
          edgeLabelBackground: "#ffffff",
          fontFamily: "var(--font-sans)",
          fontSize: "13px",
        },
  });
}

export function DeploymentArchitectureDiagram({ className }: { className?: string }) {
  const instanceId = useId().replace(/:/g, "");
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isDark = resolvedTheme === "dark";
    applyMermaidTheme(isDark);

    const graphId = `dep-arch-${instanceId}-${isDark ? "d" : "l"}`;
    let cancelled = false;

    void (async () => {
      try {
        const { svg: out } = await mermaid.render(graphId, deploymentArchitectureMermaid);
        if (!cancelled) setSvg(out);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not render diagram.");
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
          "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive",
          className,
        )}
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        className={cn(
          "flex min-h-[280px] items-center justify-center rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] dark:border-white/10 dark:bg-white/[0.03]",
          className,
        )}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent dark:border-emerald-400" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-emerald-500/15 bg-white/40 p-1 dark:border-white/10 dark:bg-black/20",
        className,
      )}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05),transparent)]" />
      <div
        className={cn(
          "overflow-x-auto px-2 py-8 md:px-8",
          "[&_svg]:mx-auto [&_svg]:block [&_svg]:max-h-[min(800px,90vh)] [&_svg]:max-w-none [&_svg]:drop-shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:[&_svg]:drop-shadow-[0_8px_30px_rgb(0,0,0,0.2)]",
          "[&_.cluster-label]:font-display [&_.cluster-label]:text-[11px] [&_.cluster-label]:font-bold [&_.cluster-label]:uppercase [&_.cluster-label]:tracking-[0.15em]",
          "[&_.node_label]:leading-tight",
        )}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

