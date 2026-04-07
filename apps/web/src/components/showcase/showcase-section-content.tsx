import { Badge } from "@/components/ui/badge";
import type { ShowcaseSection } from "@/content/showcase";
import { cn } from "@/lib/utils";

function RefList({
  title,
  items,
}: {
  title: string;
  items: { file: string; symbol?: string; note: string }[];
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
        {title}
      </p>
      <ul className="space-y-2">
        {items.map((r, idx) => (
          <li
            key={`${idx}-${r.file}-${r.symbol ?? ""}`}
            className="border-border/60 rounded-lg border bg-white/40 px-3 py-2 text-xs dark:bg-white/5"
          >
            <code className="text-foreground block font-mono text-[11px] break-all">
              {r.file}
              {r.symbol ? ` — ${r.symbol}` : ""}
            </code>
            <span className="text-muted-foreground mt-1 block leading-relaxed">
              {r.note}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ShowcaseSectionContent({
  section,
  className,
  omitBadge = false,
}: {
  section: ShowcaseSection;
  className?: string;
  /** When true, skip rendering badge (e.g. accordion trigger already shows it). */
  omitBadge?: boolean;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {!omitBadge && section.badge ? (
        <Badge
          variant="outline"
          className="border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
        >
          {section.badge}
        </Badge>
      ) : null}

      <p className="text-muted-foreground text-sm leading-relaxed">
        {section.summary}
      </p>

      {section.http ? (
        <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-2 text-xs">
          <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-200">
            {section.http.method} {section.http.path}
          </span>
          {section.http.note ? (
            <p className="text-muted-foreground mt-1">{section.http.note}</p>
          ) : null}
        </div>
      ) : null}

      {section.bullets && section.bullets.length > 0 ? (
        <ul className="text-muted-foreground list-inside list-disc space-y-1.5 text-sm leading-relaxed">
          {section.bullets.map((b, idx) => (
            <li key={`${section.id}-b-${idx}`}>{b}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <RefList title="Go" items={section.goRefs ?? []} />
        <RefList title="TypeScript / Next" items={section.tsRefs ?? []} />
      </div>

      {section.codeSample ? (
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-bold uppercase tracking-wider">
            Snippet
          </p>
          <pre className="border-border max-h-56 overflow-x-auto overflow-y-auto rounded-xl border bg-black/80 p-3 text-[11px] text-emerald-100 leading-relaxed dark:bg-black/60">
            {section.codeSample}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
