"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetchJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Clock, LogOut, Home, RefreshCcw, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";
import { ShowcaseAccordion } from "@/components/showcase/showcase-accordion";
import { bookShowcaseSections } from "@/content/showcase";
import { cn } from "@/lib/utils";

type Slot = {
  id: string;
  resource_id: string;
  starts_at: string;
  ends_at: string;
};

type AvailabilityResponse = { slots: Slot[] };

const demoResourceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

export default function BookPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const resourceId =
    process.env.NEXT_PUBLIC_DEFAULT_RESOURCE_ID?.trim() || demoResourceId;

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace("/login?next=/book");
        return;
      }
      const data = await apiFetchJson<AvailabilityResponse>(
        `/api/v1/availability?resource_id=${encodeURIComponent(resourceId)}`,
        session.access_token,
      );
      setSlots(data.slots);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        toast.error("Session expired — sign in again.");
        router.replace("/login?next=/book");
        return;
      }
      toast.error("Could not load availability.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [resourceId, router, supabase.auth]);

  useEffect(() => {
    void load();
  }, [load]);

  async function reserve(slotId: string) {
    setBooking(slotId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace("/login?next=/book");
        return;
      }
      await apiFetchJson<{ id: string; slot_id: string; status: string }>(
        "/api/v1/reservations",
        session.access_token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot_id: slotId }),
        },
      );
      toast.success("Reservation Confirmed", {
        description: "Your slot has been secured in the database."
      });
      await load();
    } catch (err) {
      const status = (err as { status?: number }).status;
      const body = (err as { body?: { error?: string } }).body;
      if (status === 409) {
        toast.error("Slot Conflict", { description: "That slot was just taken by another user." });
      } else if (status === 404) {
        toast.error("Not Found", { description: "The requested slot no longer exists." });
      } else {
        toast.error("Booking Error", {
          description: body && typeof body === "object" && "error" in body
            ? String((body as { error: string }).error)
            : "An unexpected error occurred."
        });
      }
    } finally {
      setBooking(null);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const formatTime = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  const formatDate = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
    } catch { return iso; }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background elements */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12 relative z-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Calendar className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Scheduling Engine</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-emerald-950 dark:text-white">Select a Slot</h1>
            <p className="text-muted-foreground">
              Available time windows for <span className="font-mono text-emerald-600/80 dark:text-emerald-400/80">{resourceId.slice(0, 8)}...</span>
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm", className: "rounded-xl text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400" })}>
              <Home className="mr-2 h-4 w-4" /> Home
            </Link>
            <Link
              href="/how-it-works"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "rounded-xl text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400" })}
            >
              <BookOpen className="mr-2 h-4 w-4" /> How it works
            </Link>
            <div className="h-4 w-px bg-emerald-500/10 dark:bg-white/10" />
            <Button variant="secondary" size="sm" className="rounded-xl border border-emerald-500/5 shadow-sm px-5" onClick={() => void signOut()}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </motion.div>
        </header>

        <Card className="overflow-hidden border-emerald-500/10 bg-white/70 backdrop-blur-xl shadow-2xl dark:border-white/10 dark:bg-black/40">
          <CardHeader className="border-b border-emerald-500/5 bg-emerald-500/[0.01] py-8 dark:border-white/5 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-emerald-950 dark:text-white">Availability Matrix</CardTitle>
                <CardDescription className="mt-1">
                  Real-time status synced with Go backend.
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("rounded-full transition-transform hover:bg-emerald-500/5", loading && "animate-spin")}
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-emerald-500/5 dark:divide-white/5">
              {loading && !slots && (
                <div className="p-8 space-y-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <Skeleton className="h-10 w-24 rounded-xl" />
                    </div>
                  ))}
                </div>
              )}

              {!loading && slots?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                  <div className="mb-4 rounded-full bg-emerald-500/5 p-4 text-emerald-600/50 dark:bg-white/5 dark:text-muted-foreground">
                    <AlertCircle className="h-12 w-12" />
                  </div>
                  <h3 className="text-xl font-semibold text-emerald-950 dark:text-white">No Slots Available</h3>
                  <p className="mt-2 max-w-xs text-muted-foreground">
                    All slots are currently booked or none have been generated for this resource.
                  </p>
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {slots?.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between hover:bg-emerald-500/[0.01] transition-colors dark:hover:bg-white/[0.02]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/5 text-emerald-600 ring-1 ring-emerald-500/10 group-hover:bg-emerald-500/10 transition-colors dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20 dark:group-hover:bg-emerald-500/20">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold tracking-tight text-emerald-950 dark:text-white">{formatTime(s.starts_at)}</span>
                          <div className="h-1 w-4 rounded-full bg-emerald-500/10 dark:bg-white/10" />
                          <span className="text-lg font-bold tracking-tight text-emerald-950 dark:text-white">{formatTime(s.ends_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-semibold text-emerald-900/70 dark:text-foreground/80">{formatDate(s.starts_at)}</span>
                          <span className="text-emerald-500/10 dark:text-white/10">•</span>
                          <span className="font-mono text-[10px] uppercase tracking-tighter opacity-50">{s.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Button
                        className={cn(
                          "h-11 min-w-[120px] rounded-xl font-bold transition-all",
                          booking === s.id ? "bg-emerald-500/50" : "shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20"
                        )}
                        disabled={booking !== null}
                        onClick={() => void reserve(s.id)}
                      >
                        {booking === s.id ? (
                          <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        {booking === s.id ? "Securing..." : "Reserve"}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Badge variant="outline" className="rounded-full border-emerald-500/10 bg-white/50 px-4 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground backdrop-blur-sm dark:border-white/5 dark:bg-white/5">
            System Status: Operational • Latency: 24ms
          </Badge>
        </div>

        <ShowcaseAccordion
          title="Booking API (this page)"
          description="Each action below maps to Go handlers, SQL, and JWT checks in this repo."
          sections={bookShowcaseSections}
          defaultOpenIds={["load-availability"]}
        />
      </div>
    </div>
  );
}
