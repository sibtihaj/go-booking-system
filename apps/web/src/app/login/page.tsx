"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
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
import { createClient } from "@/lib/supabase/client";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ShowcaseAccordion } from "@/components/showcase/showcase-accordion";
import { loginShowcaseSections } from "@/content/showcase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      return next;
    }
    return "/book";
  }, [searchParams]);
  const signupHref = `/signup?next=${encodeURIComponent(nextPath)}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Identity verified");
      router.push(nextPath);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

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
          <CardTitle className="text-center text-3xl font-bold tracking-tight text-emerald-950 dark:text-white">Access Portal</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Sign in to manage your bookings and secure your slots.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form className="flex flex-col gap-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-emerald-600/70 dark:text-muted-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="h-12 border-emerald-500/10 bg-emerald-500/[0.02] focus:bg-emerald-500/[0.05] transition-all dark:border-white/5 dark:bg-white/5 dark:focus:bg-white/10"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-emerald-600/70 dark:text-muted-foreground">
                  Security Key
                </Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-12 border-emerald-500/10 bg-emerald-500/[0.02] focus:bg-emerald-500/[0.05] transition-all dark:border-white/5 dark:bg-white/5 dark:focus:bg-white/10"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="h-12 text-lg font-semibold shadow-xl shadow-emerald-500/10" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Authorize Access"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href={signupHref}
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-600 dark:text-emerald-400"
                >
                  Sign up
                </Link>
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-4">
              <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-emerald-600 transition-colors group dark:hover:text-emerald-400">
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Return to home
              </Link>
              <Link href="/application-architecture" className="text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-600 dark:text-emerald-400">
                Application architecture →
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="absolute top-1/4 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none dark:bg-emerald-500/10" />
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
                </CardContent>
              </Card>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
        <div className="relative z-10 w-full max-w-3xl">
          <ShowcaseAccordion
            title="Auth & session (this step)"
            description="What happens when you sign in: Supabase sessions, Next middleware, and why the Go API trusts your Bearer token."
            sections={loginShowcaseSections}
            defaultOpenIds={["supabase-session"]}
          />
        </div>
      </div>
    </div>
  );
}
