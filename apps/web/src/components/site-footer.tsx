import Link from "next/link";
import type { ReactNode } from "react";
import { Calendar, ArrowUpRight, Layers, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 98 96"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.896-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      />
    </svg>
  );
}

const GITHUB_REPO_URL = "https://github.com/sibtihaj/go-booking-system";
const PORTFOLIO_URL = "https://syedibtihaj.com";

const exploreLinks = [
  { href: "/", label: "Home" },
  { href: "/application-architecture", label: "Application Architecture" },
  { href: "/book", label: "Book" },
  { href: "/login", label: "Sign in" },
] as const;

function ExternalPill({
  href,
  label,
  sublabel,
  icon,
  className,
}: {
  href: string;
  label: string;
  sublabel: string;
  icon: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}: ${sublabel} (opens in a new tab)`}
      className={cn(
        "group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-emerald-500/15 bg-white/60 px-4 py-3.5 shadow-sm backdrop-blur-md transition-all duration-300",
        "hover:border-emerald-500/35 hover:bg-white/90 hover:shadow-md hover:shadow-emerald-500/10",
        "dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-emerald-500/30 dark:hover:bg-white/[0.07]",
        className,
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 text-emerald-700 ring-1 ring-emerald-500/10 dark:from-emerald-500/20 dark:to-cyan-500/10 dark:text-emerald-300">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-display text-sm font-semibold tracking-tight text-emerald-950 dark:text-white">
          {label}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
          {sublabel}
        </span>
      </span>
      <ArrowUpRight
        className="h-4 w-4 shrink-0 text-emerald-600/50 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-emerald-400/70 dark:group-hover:text-emerald-400"
        aria-hidden
      />
    </a>
  );
}

export function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "relative mt-auto overflow-hidden border-t border-emerald-500/[0.12] bg-gradient-to-b from-emerald-950/[0.02] via-background to-background dark:border-white/[0.08] dark:from-emerald-950/30",
        className,
      )}
    >
      {/* Accent line + soft glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 bottom-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-[80px] dark:bg-cyan-500/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 top-8 h-40 w-40 rounded-full bg-emerald-500/10 blur-[70px] dark:bg-emerald-500/15"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-14 md:pb-14 md:pt-16">
        <div className="grid gap-12 md:grid-cols-12 md:gap-10 lg:gap-14">
          {/* Brand */}
          <div className="md:col-span-5">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-emerald-500/60"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/25">
                <Calendar className="h-6 w-6 text-white" aria-hidden />
              </span>
              <span className="font-display text-xl font-bold tracking-tight text-emerald-950 dark:text-white">
                IB Scheduling
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              A portfolio-grade booking flow: Supabase Auth in the browser, a Go API
              on Postgres, and a Next.js UI wired for clarity.
            </p>
            <div className="mt-6 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-emerald-700/70 dark:text-emerald-400/80">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              Next.js · Go · Supabase
            </div>
          </div>

          {/* Explore */}
          <nav
            className="md:col-span-3"
            aria-label="Site"
          >
            <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-800/80 dark:text-emerald-300/90">
              Explore
            </h2>
            <ul className="mt-5 space-y-3">
              {exploreLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group inline-flex items-center text-sm font-medium text-slate-600 transition-colors hover:text-emerald-800 dark:text-slate-400 dark:hover:text-emerald-300"
                  >
                    <span className="h-px w-0 bg-emerald-500 transition-all duration-300 group-hover:mr-2 group-hover:w-4 dark:bg-emerald-400" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Outbound */}
          <div className="md:col-span-4">
            <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-800/80 dark:text-emerald-300/90">
              Links
            </h2>
            <div className="mt-5 flex flex-col gap-3">
              <ExternalPill
                href={GITHUB_REPO_URL}
                label="GitHub"
                sublabel="sibtihaj / go-booking-system"
                icon={<GitHubMark className="h-5 w-5" />}
              />
              <ExternalPill
                href={PORTFOLIO_URL}
                label="Portfolio"
                sublabel="syedibtihaj.com"
                icon={<Globe className="h-5 w-5" aria-hidden />}
              />
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-emerald-500/10 pt-8 sm:flex-row sm:items-center dark:border-white/10">
          <p className="font-mono text-xs text-muted-foreground">
            © {year} Syed Ibtihaj. Built as a portfolio piece.
          </p>
          <p className="text-xs text-muted-foreground">
            Source available on{" "}
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-800 underline-offset-4 transition-colors hover:text-emerald-600 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
