/**
 * Parse a Prometheus exposition-format gauge line, e.g. "go_goroutines 42".
 */
export function parsePrometheusGauge(
  text: string,
  metricName: string,
): number | null {
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed === "") continue;
    const parts = trimmed.split(/\s+/);
    if (parts[0] === metricName && parts.length >= 2) {
      const v = Number(parts[1]);
      if (Number.isFinite(v)) {
        return Math.round(v);
      }
    }
  }
  return null;
}

/**
 * Fetch current go_goroutines from the API /metrics endpoint.
 * Tries same-origin proxy first, then NEXT_PUBLIC_API_URL (may require CORS on the API).
 */
export async function fetchGoGoroutinesFromMetrics(): Promise<number | null> {
  const urls: string[] = [];
  if (typeof window !== "undefined") {
    urls.push(`${window.location.origin}/booking-api-metrics`);
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (apiBase) {
    urls.push(`${apiBase}/metrics`);
  }

  const tried = new Set<string>();
  for (const url of urls) {
    if (tried.has(url)) continue;
    tried.add(url);
    try {
      const res = await fetch(url, {
        cache: "no-store",
        credentials: "omit",
      });
      if (!res.ok) continue;
      const text = await res.text();
      const n = parsePrometheusGauge(text, "go_goroutines");
      if (n !== null) return n;
    } catch {
      continue;
    }
  }
  return null;
}
