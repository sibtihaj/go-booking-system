/** Illustrative Go vs Node comparison for the book page accordion (concurrency section). */
export function GoNodeConcurrencyTable() {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-emerald-500/10 bg-white/30 p-3 dark:bg-black/20">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-900/70 dark:text-emerald-200/80">
          Go vs typical Node.js / TypeScript (illustrative)
        </p>
        <p className="mb-2 text-[10px] text-muted-foreground">
          Not a measured benchmark of this repo—patterns you usually see when comparing runtimes
          under many concurrent DB-bound tasks.
        </p>
        <table className="w-full min-w-[36rem] border-collapse text-left text-[10px]">
          <thead>
            <tr className="border-b border-emerald-500/15 text-muted-foreground">
              <th className="py-2 pr-3 font-semibold">Aspect</th>
              <th className="py-2 pr-3 font-semibold text-emerald-800 dark:text-emerald-300">
                Go API (this service)
              </th>
              <th className="py-2 font-semibold">Typical Node.js (TS)</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-emerald-500/10 align-top">
              <td className="py-2 pr-3 font-medium text-foreground">Concurrent work model</td>
              <td className="py-2 pr-3">
                Native <strong className="text-emerald-800 dark:text-emerald-300">goroutines</strong>:
                one per simulated booking in the benchmark; scheduler multiplexes many onto a few OS
                threads.
              </td>
              <td className="py-2">
                <strong>Event loop</strong> + thread pool for some I/O; work is usually{" "}
                <strong>async</strong> callbacks / promises, not one OS thread per booking.
              </td>
            </tr>
            <tr className="border-b border-emerald-500/10 align-top">
              <td className="py-2 pr-3 font-medium text-foreground">DB connections</td>
              <td className="py-2 pr-3">
                Still bounded by <strong>pgx pool</strong> (and Supabase pooler). Goroutines wait on
                the pool—same ceiling as any stack.
              </td>
              <td className="py-2">
                <strong>pg</strong> / driver pool also caps concurrency; the loop stays non-blocking,
                but <strong>throughput</strong> is still pool-limited.
              </td>
            </tr>
            <tr className="border-b border-emerald-500/10 align-top">
              <td className="py-2 pr-3 font-medium text-foreground">Under heavy parallel load</td>
              <td className="py-2 pr-3">
                Goroutines + cheap stacks: often <strong>stable tail latency</strong> for CPU/light
                work; GC is separate from the scheduling model.
              </td>
              <td className="py-2">
                <strong>GC + event-loop delay</strong> can grow when the heap or callback queue is
                stressed; tuning and worker threads matter.
              </td>
            </tr>
            <tr className="align-top">
              <td className="py-2 pr-3 font-medium text-foreground">Takeaway</td>
              <td className="py-2 pr-3">
                Good fit for <strong>many concurrent blocking-style</strong> DB operations expressed as
                straight-line code.
              </td>
              <td className="py-2">
                Excellent for I/O-heavy apps with async patterns; for the same{" "}
                <strong>N parallel reserves</strong>, you still need a pool and careful tuning—the
                bottleneck is often <strong>Postgres</strong>, not the language alone.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}
