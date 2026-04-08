import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ObservabilityNavBarGroup } from "@/components/observability-nav-buttons";
import { Calendar, LogIn, BookOpen, Server, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function SiteHeader({
  className,
}: {
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-6",
        className,
      )}
    >
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20">
          <Calendar className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-emerald-950 dark:text-white">
          IB Scheduling
        </span>
      </Link>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <Link
          href="/application-architecture"
          className={buttonVariants({
            variant: "ghost",
            className:
              "h-10 gap-1.5 rounded-xl text-emerald-900 hover:bg-emerald-500/10 dark:text-emerald-100",
          })}
        >
          <BookOpen className="h-4 w-4" />
          Application Architecture
        </Link>
        <Link
          href="/deployment-architecture"
          className={buttonVariants({
            variant: "outline",
            className:
              "h-10 gap-1.5 rounded-xl border-emerald-500/20 bg-emerald-500/5 text-emerald-900 hover:bg-emerald-500/10 dark:text-emerald-100",
          })}
        >
          <Server className="h-4 w-4" />
          Deployment Architecture
        </Link>
        <ObservabilityNavBarGroup />
        <Link
          href="/signup"
          className={buttonVariants({
            variant: "ghost",
            className:
              "h-10 gap-1.5 rounded-xl text-emerald-900 hover:bg-emerald-500/10 dark:text-emerald-100",
          })}
        >
          <UserPlus className="h-4 w-4" />
          Sign up
        </Link>
        <Link
          href="/login"
          className={buttonVariants({
            variant: "outline",
            className:
              "h-11 rounded-xl border-emerald-500/10 bg-white/50 px-5 backdrop-blur-md shadow-sm hover:bg-emerald-500/5 dark:bg-white/5",
          })}
        >
          <LogIn className="mr-2 h-4 w-4" /> Sign In
        </Link>
      </div>
    </nav>
  );
}
