"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { Shield, ArrowLeft, Loader2, KeyRound, Mail, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ShowcaseAccordion } from "@/components/showcase/showcase-accordion";
import { loginShowcaseSections } from "@/content/showcase";

const DEMO_EMAIL = "admin@noemail.com";
const DEMO_PASSWORD = "admin123";

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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    return sanitizeNextPath(searchParams.get("next"));
  }, [searchParams]);
  const signupHref = `/signup?next=${encodeURIComponent(nextPath)}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  async function signInDemoAccount() {
    const firstAttempt = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (!firstAttempt.error) return { ok: true as const };

    const invalidCredentials =
      firstAttempt.error.message.toLowerCase().includes("invalid login credentials");
    if (!invalidCredentials) {
      return { ok: false as const, message: firstAttempt.error.message };
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      options: { emailRedirectTo: redirectTo },
    });

    if (signupError && !signupError.message.toLowerCase().includes("already")) {
      return { ok: false as const, message: signupError.message };
    }

    if (signupData.user && !signupData.session) {
      return {
        ok: false as const,
        message:
          "Demo account requires email confirmation in this environment. Use Create account and confirm your email before signing in.",
      };
    }

    const secondAttempt = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (secondAttempt.error) {
      return {
        ok: false as const,
        message:
          "Could not sign in with the demo account. Use Create account and confirm your email, then sign in again.",
      };
    }

    return { ok: true as const };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const usingDemoAccount =
        email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
      if (usingDemoAccount) {
        const demoResult = await signInDemoAccount();
        if (!demoResult.ok) {
          toast.error(demoResult.message);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(
            `${error.message}. If you are new, create an account first and confirm your email address.`,
          );
          return;
        }
      }
      toast.success(usingDemoAccount ? "Demo access verified" : "Identity verified");
      router.replace(nextPath);
      router.refresh();
      // Fallback for rare client-router stalls in production after auth cookie changes.
      window.setTimeout(() => {
        if (window.location.pathname !== nextPath) {
          window.location.assign(nextPath);
        }
      }, 350);
    } finally {
      setBusy(false);
    }
  }

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
            <Shield className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Secure Access</span>
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-emerald-950 dark:text-white sm:text-5xl">
            Welcome <span className="text-emerald-500/80">Back</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-sm leading-relaxed">
            Sign in to manage your bookings and secure your slots in real-time.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">
            Demo login: <span className="font-mono">{DEMO_EMAIL}</span> /{" "}
            <span className="font-mono">{DEMO_PASSWORD}</span>
          </p>
          <p className="mt-1 text-muted-foreground">
            If demo login is blocked in this environment, create an account and confirm your email
            from the inbox, then sign in.
          </p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-widest text-emerald-900/50 dark:text-emerald-400/50 ml-1">
              Email Address
            </Label>
            <div className="group relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/40 transition-colors group-focus-within:text-emerald-500">
                <Mail className="h-5 w-5" />
              </div>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="h-14 pl-12 rounded-2xl border-emerald-500/10 bg-white/50 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/20 dark:bg-black/20 dark:border-white/5"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-widest text-emerald-900/50 dark:text-emerald-400/50 ml-1">
              Security Key
            </Label>
            <div className="group relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/40 transition-colors group-focus-within:text-emerald-500">
                <KeyRound className="h-5 w-5" />
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-14 pl-12 rounded-2xl border-emerald-500/10 bg-white/50 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/20 dark:bg-black/20 dark:border-white/5"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
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
                  Authorize Access
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-4 pt-4 border-t border-emerald-500/10">
          <p className="text-sm text-muted-foreground">
            New to IB Scheduling?{" "}
            <Link
              href={signupHref}
              className="font-bold text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 transition-colors"
            >
              Create an account
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

export default function LoginPage() {
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
                  </div>
                </div>
              }
            >
              <LoginForm />
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
                  <h2 className="font-display text-2xl font-bold tracking-tight">System Architecture</h2>
                  <p className="text-emerald-100/60 text-sm leading-relaxed max-w-md">
                    Explore how we handle high-concurrency booking using Go goroutines and Postgres row-level locking.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Link 
                      href="/application-architecture"
                      className="group/btn inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      App architecture
                      <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                    <Link 
                      href="/deployment-architecture"
                      className="group/btn inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Deployment architecture
                      <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>

              <ShowcaseAccordion
                title="Auth & session (this step)"
                description="What happens when you sign in: Supabase sessions, Next middleware, and why the Go API trusts your Bearer token."
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
