"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, ArrowLeft, Loader2, Mail, KeyRound, ChevronRight, UserPlus } from "lucide-react";
import { ShowcaseAccordion } from "@/components/showcase/showcase-accordion";
import { loginShowcaseSections } from "@/content/showcase";
import { cn } from "@/lib/utils";

function sanitizeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/book";
  if (next.length > 200) return "/book";
  if (next.includes(".segments") || next.includes("_tree.segment")) return "/book";
  if (
    next.startsWith("/grafana-dashboard") ||
    next.startsWith("/prometheus-dashboard") ||
    next.startsWith("/booking-api-metrics")
  ) {
    return "/book";
  }
  return next;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    return sanitizeNextPath(searchParams.get("next"));
  }, [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) {
          router.replace(nextPath);
        }
      })
      .catch(() => {});
  }, [nextPath, router, supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const origin = window.location.origin;
      const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.message("Verification link sent", {
        description: "Please check your inbox to confirm your account.",
      });
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
            <UserPlus className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Join Portal</span>
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-emerald-950 dark:text-white sm:text-5xl">
            Create <span className="text-emerald-500/80">Account</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-sm leading-relaxed">
            Join IB Scheduling to experience high-concurrency booking powered by Go.
          </p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-[11px] font-bold uppercase tracking-widest text-emerald-900/50 dark:text-emerald-400/50 ml-1">
              Email Address
            </Label>
            <div className="group relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/40 transition-colors group-focus-within:text-emerald-500">
                <Mail className="h-5 w-5" />
              </div>
              <Input
                id="signup-email"
                type="email"
                placeholder="name@example.com"
                className="h-14 pl-12 rounded-2xl border-emerald-500/10 bg-white/50 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/20 dark:bg-black/20 dark:border-white/5"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-[11px] font-bold uppercase tracking-widest text-emerald-900/50 dark:text-emerald-400/50 ml-1">
              Password
            </Label>
            <div className="group relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/40 transition-colors group-focus-within:text-emerald-500">
                <KeyRound className="h-5 w-5" />
              </div>
              <Input
                id="signup-password"
                type="password"
                placeholder="••••••••"
                className="h-14 pl-12 rounded-2xl border-emerald-500/10 bg-white/50 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/20 dark:bg-black/20 dark:border-white/5"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-confirm" className="text-[11px] font-bold uppercase tracking-widest text-emerald-900/50 dark:text-emerald-400/50 ml-1">
              Confirm Password
            </Label>
            <div className="group relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/40 transition-colors group-focus-within:text-emerald-500">
                <KeyRound className="h-5 w-5" />
              </div>
              <Input
                id="signup-confirm"
                type="password"
                placeholder="••••••••"
                className="h-14 pl-12 rounded-2xl border-emerald-500/10 bg-white/50 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/20 dark:bg-black/20 dark:border-white/5"
                value={confirmPassword}
                onChange={(ev) => setConfirmPassword(ev.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              className="h-14 w-full rounded-2xl text-base font-bold shadow-lg shadow-emerald-600/20 transition-all hover:shadow-emerald-600/30 active:scale-[0.98]" 
              disabled={busy}
            >
              {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (
                <>
                  Create Account
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-4 pt-4 border-t border-emerald-500/10">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={loginHref}
              className="font-bold text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 transition-colors"
            >
              Sign in instead
            </Link>
          </p>
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-emerald-600 transition-colors group dark:hover:text-emerald-400">
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_100%_0%,_var(--tw-gradient-stops))] from-emerald-50/50 via-transparent to-transparent dark:from-emerald-950/20 pointer-events-none" />
      <div className="fixed top-0 left-0 -z-10 h-[600px] w-[600px] bg-emerald-200/10 blur-[140px] rounded-full dark:bg-emerald-500/5 pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      
      <SiteHeader />
      
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:py-20">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left: Form Column */}
          <div className="w-full max-w-md mx-auto lg:mx-0 order-2 lg:order-1">
            <Suspense
              fallback={
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-32 rounded-full" />
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                  <div className="space-y-6">
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                  </div>
                </div>
              }
            >
              <SignupForm />
            </Suspense>
          </div>

          {/* Right: Info/Accordion Column */}
          <div className="order-1 lg:order-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="space-y-6"
            >
              <div className="p-8 rounded-[2.5rem] bg-emerald-950 text-white dark:bg-emerald-900/40 border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 bg-emerald-500/20 blur-[80px] rounded-full group-hover:bg-emerald-500/30 transition-colors duration-700" />
                
                <div className="relative z-10 space-y-4">
                  <h2 className="font-display text-2xl font-bold tracking-tight">Portfolio Showcase</h2>
                  <p className="text-emerald-100/60 text-sm leading-relaxed max-w-md">
                    This system demonstrates a production-grade architecture using Next.js, Go, and Supabase to solve real-world scheduling challenges.
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      <Shield className="h-3.5 w-3.5" />
                      JWT Auth
                    </div>
                    <div className="h-1 w-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      <KeyRound className="h-3.5 w-3.5" />
                      Secure Session
                    </div>
                  </div>
                </div>
              </div>

              <ShowcaseAccordion
                title="Auth & registration"
                description="What happens when you sign up: Supabase email confirmation, sessions, Next middleware, and why the Go API trusts your Bearer token."
                sections={loginShowcaseSections}
                defaultOpenIds={["supabase-session"]}
                className="border-emerald-500/10 bg-white/40 dark:bg-white/[0.02]"
              />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
