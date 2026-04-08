"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetchJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { CalendarPlus, ClipboardList, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReservationRow = {
  id: string;
  slot_id: string;
  status: string;
  resource_id: string;
  starts_at: string;
  ends_at: string;
};

type BookingExtrasProps = {
  resourceId: string;
  reservations: ReservationRow[] | null;
  onRefresh: () => void;
  formatTime: (iso: string) => string;
  formatDate: (iso: string) => string;
};

function toRFC3339Local(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function BookingExtras({
  resourceId,
  reservations,
  onRefresh,
  formatTime,
  formatDate,
}: BookingExtrasProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [startsLocal, setStartsLocal] = useState("");
  const [endsLocal, setEndsLocal] = useState("");
  const [creating, setCreating] = useState(false);

  async function createSlot(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = toRFC3339Local(startsLocal);
    const endsAt = toRFC3339Local(endsLocal);
    if (!startsAt || !endsAt) {
      toast.error("Invalid times", { description: "Choose a valid start and end." });
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      toast.error("End must be after start.");
      return;
    }
    setCreating(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace("/login?next=/book");
        return;
      }
      await apiFetchJson<{ slot: { id: string } }>(
        "/api/v1/slots",
        session.access_token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resource_id: resourceId,
            starts_at: startsAt,
            ends_at: endsAt,
          }),
        },
      );
      toast.success("Slot added", { description: "The new window is available to book." });
      setStartsLocal("");
      setEndsLocal("");
      onRefresh();
    } catch (err) {
      const status = (err as { status?: number }).status;
      const body = (err as { body?: { error?: string } }).body;
      const code =
        body && typeof body === "object" && body && "error" in body
          ? String((body as { error: string }).error)
          : "";
      if (status === 403) {
        toast.error("Slot creation locked", {
          description:
            "The API has SLOT_CREATE_SECRET set. Use X-Slot-Admin-Key from a trusted client or leave the secret empty for local demo.",
        });
      } else if (status === 409) {
        toast.error("Duplicate slot", { description: "That start time already exists for this resource." });
      } else {
        toast.error("Could not create slot", {
          description: code || "Check times and try again.",
        });
      }
    } finally {
      setCreating(false);
    }
  }

  const panelClass =
    "rounded-2xl border border-emerald-500/[0.12] bg-white/[0.45] p-6 shadow-sm backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.03]";

  return (
    <div className="grid w-full gap-8 lg:grid-cols-2 lg:gap-10">
      {/* My bookings — editorial list, restrained scale */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={cn(panelClass, "flex flex-col min-h-[280px]")}
        aria-labelledby="bookings-heading"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p
              id="bookings-heading"
              className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/45 dark:text-emerald-100/35"
            >
              Your reservations
            </p>
            <p className="text-sm leading-snug text-muted-foreground">
              Confirmed bookings tied to your account.
            </p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/10 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300">
            <ClipboardList className="h-4 w-4 opacity-80" strokeWidth={1.5} />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {reservations === null ? (
            <div className="flex flex-1 flex-col justify-center gap-3 py-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg bg-emerald-500/[0.06] dark:bg-white/[0.06]"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          ) : reservations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-emerald-500/15 bg-emerald-500/[0.02] px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground/80">No bookings yet</p>
              <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                Reserve an open slot from the list — it will appear here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[320px] space-y-0 overflow-y-auto pr-1">
              {reservations.map((r) => (
                <li
                  key={r.id}
                  className="group border-b border-emerald-500/[0.07] py-3.5 last:border-b-0 dark:border-white/[0.06]"
                >
                  <div className="flex gap-3">
                    <div
                      className="mt-0.5 h-full w-px shrink-0 bg-gradient-to-b from-emerald-500/50 to-transparent opacity-60"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-mono text-[0.7rem] tabular-nums text-emerald-950 dark:text-emerald-50">
                          {formatTime(r.starts_at)}
                        </span>
                        <span className="text-[0.65rem] text-muted-foreground/70">→</span>
                        <span className="font-mono text-[0.7rem] tabular-nums text-emerald-950 dark:text-emerald-50">
                          {formatTime(r.ends_at)}
                        </span>
                      </div>
                      <p className="text-[0.7rem] text-muted-foreground">
                        {formatDate(r.starts_at)}
                      </p>
                      <p className="truncate font-mono text-[0.62rem] tracking-wide text-muted-foreground/50">
                        {r.slot_id.slice(0, 8)}…
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.section>

      {/* Add slot — utilitarian form */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        className={cn(panelClass, "flex flex-col")}
        aria-labelledby="add-slot-heading"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p
              id="add-slot-heading"
              className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/45 dark:text-emerald-100/35"
            >
              Add availability
            </p>
            <p className="text-sm leading-snug text-muted-foreground">
              Create a new bookable window for this resource.
            </p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/10 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300">
            <CalendarPlus className="h-4 w-4 opacity-80" strokeWidth={1.5} />
          </div>
        </div>

        <form onSubmit={(e) => void createSlot(e)} className="flex flex-1 flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slot-start" className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
                Starts
              </Label>
              <Input
                id="slot-start"
                type="datetime-local"
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
                className="h-10 rounded-xl border-emerald-500/15 bg-white/80 text-sm dark:bg-black/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-end" className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
                Ends
              </Label>
              <Input
                id="slot-end"
                type="datetime-local"
                value={endsLocal}
                onChange={(e) => setEndsLocal(e.target.value)}
                className="h-10 rounded-xl border-emerald-500/15 bg-white/80 text-sm dark:bg-black/20"
                required
              />
            </div>
          </div>
          <p className="text-[0.65rem] leading-relaxed text-muted-foreground/80">
            Times use your local timezone. Empty <code className="rounded bg-emerald-500/10 px-1 font-mono text-[0.65rem]">SLOT_CREATE_SECRET</code>{" "}
            on the API allows any signed-in user to add slots (demo). Set the secret in production and send{" "}
            <code className="rounded bg-emerald-500/10 px-1 font-mono text-[0.65rem]">X-Slot-Admin-Key</code>.
          </p>
          <Button
            type="submit"
            disabled={creating}
            className="mt-auto h-10 w-full rounded-xl text-sm font-semibold sm:w-auto sm:self-start"
            variant="default"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Publish slot"
            )}
          </Button>
        </form>
      </motion.section>
    </div>
  );
}
