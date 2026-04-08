"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { SiteHeader } from "@/components/site-header";
import { ShowcaseAccordion } from "@/components/showcase/showcase-accordion";
import { ShowcaseSectionContent } from "@/components/showcase/showcase-section-content";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  apiEndpointsTable,
  databaseConstraintsBullets,
  deployBullets,
  applicationArchitectureAllSections,
  applicationArchitectureIntro,
} from "@/content/showcase";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ArchitectureDiagram } from "@/components/architecture/architecture-diagram";

export default function ApplicationArchitecturePage() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/80 via-background to-background dark:from-emerald-900/15" />
      <SiteHeader />

      <main className="mx-auto max-w-4xl space-y-10 px-6 py-10 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950 dark:text-white md:text-4xl">
            Application Architecture
          </h1>
          <Link
            href="/"
            className={buttonVariants({ variant: "ghost", className: "rounded-xl" })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Home
          </Link>
        </div>

        <Card className="border-emerald-500/10 bg-white/70 backdrop-blur-md dark:bg-white/[0.04]">
          <CardContent className="pt-6">
            <ShowcaseSectionContent section={applicationArchitectureIntro} />
          </CardContent>
        </Card>

        <Card
          id="system-architecture"
          className="scroll-mt-24 border-emerald-500/10 bg-white/70 backdrop-blur-md dark:bg-white/[0.04]"
        >
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
              >
                Architecture
              </Badge>
              <CardTitle className="text-emerald-950 dark:text-white">
                System diagram
              </CardTitle>
            </div>
            <CardDescription className="text-pretty">
              How the browser, Next.js, Supabase (Auth + Postgres), and the Go API exchange requests.
              The Go service never sees the Supabase anon key—only the user&apos;s{" "}
              <code className="font-mono text-xs">access_token</code> as a Bearer JWT, verified against
              the Auth issuer (JWKS).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ArchitectureDiagram key={resolvedTheme === "dark" ? "dark" : "light"} />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Source:{" "}
              <code className="font-mono text-[11px]">apps/web/src/content/system-architecture.mmd.ts</code>
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/10 bg-white/70 backdrop-blur-md dark:bg-white/[0.04]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
              >
                Go API
              </Badge>
              <CardTitle className="text-emerald-950 dark:text-white">
                HTTP surface
              </CardTitle>
            </div>
            <CardDescription>
              Public vs JWT-protected routes mounted in{" "}
              <code className="font-mono text-xs">apps/api/cmd/server/main.go</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-emerald-500/15 text-muted-foreground">
                  <th className="py-2 pr-4 font-semibold">Method</th>
                  <th className="py-2 pr-4 font-semibold">Path</th>
                  <th className="py-2 pr-4 font-semibold">Auth</th>
                  <th className="py-2 font-semibold">Handler</th>
                </tr>
              </thead>
              <tbody>
                {apiEndpointsTable.map((row) => (
                  <tr
                    key={row.path}
                    className="border-b border-emerald-500/10 last:border-0"
                  >
                    <td className="py-2 pr-4 font-mono text-xs">{row.method}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{row.path}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{row.auth}</td>
                    <td className="py-2">
                      <span className="font-mono text-xs">{row.handler}</span>
                      <span className="text-muted-foreground mt-0.5 block text-[11px]">
                        {row.file}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-emerald-500/10 bg-white/70 backdrop-blur-md dark:bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="text-lg text-emerald-950 dark:text-white">
                Database invariants
              </CardTitle>
              <CardDescription>
                Schema in <code className="font-mono text-xs">db/migrations/</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-muted-foreground list-inside list-disc space-y-2 text-sm leading-relaxed">
                {databaseConstraintsBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/10 bg-white/70 backdrop-blur-md dark:bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="text-lg text-emerald-950 dark:text-white">
                Deploy &amp; env
              </CardTitle>
              <CardDescription>Operational recap</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-muted-foreground list-inside list-disc space-y-2 text-sm leading-relaxed">
                {deployBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <ShowcaseAccordion
          title="Deep dive by topic"
          description="Expand each section for file pointers, HTTP details, and snippets tied to this repository."
          sections={applicationArchitectureAllSections}
          defaultOpenIds={["stack", "supabase-session", "load-availability"]}
        />
      </main>
    </div>
  );
}
