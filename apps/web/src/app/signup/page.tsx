"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";
import { ShowcaseAccordion } from "@/components/showcase/showcase-accordion";
import { loginShowcaseSections } from "@/content/showcase";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      return next;
    }
    return "/book";
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="relative overflow-hidden border-emerald-500/10 bg-white/70 backdrop-blur-xl shadow-2xl dark:border-white/10 dark:bg-black/40">
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500" />
        <CardHeader className="space-y-1 pt-8">
          <div className="mb-4 flex justify-center">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
              <Shield className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-center text-3xl font-bold tracking-tight text-emerald-950 dark:text-white">
            Sign up
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Create an account with email and password. After you confirm your email, sign in to book.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form className="flex flex-col gap-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label
                htmlFor="signup-email"
                className="text-xs font-bold uppercase tracking-wider text-emerald-600/70 dark:text-muted-foreground"
              >
                Email address
              </Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="name@example.com"
                className="h-12 border-emerald-500/10 bg-emerald-500/[0.02] transition-all focus:bg-emerald-500/[0.05] dark:border-white/5 dark:bg-white/5 dark:focus:bg-white/10"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="signup-password"
                className="text-xs font-bold uppercase tracking-wider text-emerald-600/70 dark:text-muted-foreground"
              >
                Password
              </Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="••••••••"
                className="h-12 border-emerald-500/10 bg-emerald-500/[0.02] transition-all focus:bg-emerald-500/[0.05] dark:border-white/5 dark:bg-white/5 dark:focus:bg-white/10"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="signup-confirm"
                className="text-xs font-bold uppercase tracking-wider text-emerald-600/70 dark:text-muted-foreground"
              >
                Confirm password
              </Label>
              <Input
                id="signup-confirm"
                type="password"
                placeholder="••••••••"
                className="h-12 border-emerald-500/10 bg-emerald-500/[0.02] transition-all focus:bg-emerald-500/[0.05] dark:border-white/5 dark:bg-white/5 dark:focus:bg-white/10"
                value={confirmPassword}
                onChange={(ev) => setConfirmPassword(ev.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                className="h-12 text-lg font-semibold shadow-xl shadow-emerald-500/10"
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  "Create account"
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href={loginHref}
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-600 dark:text-emerald-400"
                >
                  Sign in
                </Link>
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/"
                className="group inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Return to home
              </Link>
              <Link
                href="/how-it-works"
                className="text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-600 dark:text-emerald-400"
              >
                How auth works →
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute top-1/4 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[120px] dark:bg-emerald-500/10" />
      <SiteHeader />
      <div className="flex flex-1 flex-col items-center gap-10 px-6 py-10 pb-16">
        <div className="relative z-10 w-full max-w-md">
          <Suspense
            fallback={
              <Card className="border-emerald-500/10 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
                <CardHeader className="space-y-4">
                  <Skeleton className="mx-auto h-12 w-12 rounded-2xl" />
                  <Skeleton className="mx-auto h-8 w-40" />
                  <Skeleton className="mx-auto h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            }
          >
            <SignupForm />
          </Suspense>
        </div>
        <div className="relative z-10 w-full max-w-3xl">
          <ShowcaseAccordion
            title="Auth & session (this step)"
            description="What happens when you sign up: Supabase email confirmation, sessions, Next middleware, and why the Go API trusts your Bearer token."
            sections={loginShowcaseSections}
            defaultOpenIds={["supabase-session"]}
          />
        </div>
      </div>
    </div>
  );
}
