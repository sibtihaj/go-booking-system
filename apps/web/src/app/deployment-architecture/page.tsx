"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowLeft, Expand, Shrink, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeploymentArchitectureDiagram } from "@/components/architecture/deployment-architecture-diagram";

export default function DeploymentArchitecturePage() {
  const { resolvedTheme } = useTheme();
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && modalContentRef.current) {
        await modalContentRef.current.requestFullscreen();
        setIsFullscreen(true);
        return;
      }
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/80 via-background to-background dark:from-emerald-900/15" />
      <SiteHeader />

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950 dark:text-white md:text-4xl">
            Deployment Architecture
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/application-architecture"
              className={buttonVariants({ variant: "outline", className: "rounded-xl" })}
            >
              Application Architecture
            </Link>
            <Link
              href="/"
              className={buttonVariants({ variant: "ghost", className: "rounded-xl" })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Home
            </Link>
          </div>
        </div>

        <Card className="border-emerald-500/10 bg-white/70 backdrop-blur-md dark:bg-white/[0.04]">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
              >
                Infra
              </Badge>
              <CardTitle className="text-emerald-950 dark:text-white">
                Supabase + Vercel + Railway topology
              </CardTitle>
            </div>
            <CardDescription className="text-pretty">
              Frontend runs on Vercel, backend services run on Railway (Go API, Prometheus,
              Grafana), and Supabase provides Auth + Postgres.
            </CardDescription>
            <div className="pt-2">
              <Button
                type="button"
                size="lg"
                className="h-12 rounded-xl bg-emerald-600 px-6 text-base font-semibold text-white shadow-md shadow-emerald-600/25 transition-colors hover:bg-emerald-700"
                onClick={() => setDiagramModalOpen(true)}
              >
                <Expand className="mr-2 h-5 w-5" />
                Open deployment diagram
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DeploymentArchitectureDiagram key={resolvedTheme === "dark" ? "dark" : "light"} />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Source:{" "}
              <code className="font-mono text-[11px]">
                apps/web/src/content/deployment-architecture.mmd.ts
              </code>
            </p>
          </CardContent>
        </Card>
      </main>

      {diagramModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Deployment architecture diagram modal"
        >
          <div
            ref={modalContentRef}
            className="relative flex h-[90vh] w-full max-w-7xl flex-col rounded-2xl border border-emerald-500/20 bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground md:text-base">
                Deployment architecture
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={handleToggleFullscreen}
                >
                  {isFullscreen ? (
                    <>
                      <Shrink className="mr-1.5 h-4 w-4" />
                      Exit fullscreen
                    </>
                  ) : (
                    <>
                      <Expand className="mr-1.5 h-4 w-4" />
                      Fullscreen
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-lg"
                  onClick={() => setDiagramModalOpen(false)}
                  aria-label="Close deployment diagram modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
              <DeploymentArchitectureDiagram
                key={`modal-${resolvedTheme === "dark" ? "dark" : "light"}`}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

