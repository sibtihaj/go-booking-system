import type { NextConfig } from "next";

/**
 * Observability reverse-proxy paths (Vercel rewrites → external origins).
 *
 * Origins are read from OBSERVABILITY_*_ORIGIN if set, otherwise from NEXT_PUBLIC_OBSERVABILITY_*_URL
 * so you only need one set of Vercel env vars (the NEXT_PUBLIC URLs used by the nav buttons).
 *
 * - /grafana-dashboard → Grafana origin with path /grafana-dashboard/...
 * - /prometheus-dashboard → Prometheus origin (UI often at /graph).
 * - /booking-api-metrics → Go API GET /metrics (optional exposure on your app domain).
 */
function trimOrigin(value: string | undefined): string | undefined {
  const t = value?.trim();
  if (!t) return undefined;
  return t.replace(/\/$/, "");
}

/** Strip path from a full URL (e.g. .../metrics → origin) for rewrite targets. */
function originFromUrl(value: string | undefined): string | undefined {
  const t = trimOrigin(value);
  if (!t) return undefined;
  try {
    const u = new URL(t);
    return `${u.protocol}//${u.host}`;
  } catch {
    return t;
  }
}

const grafanaOrigin =
  trimOrigin(process.env.OBSERVABILITY_GRAFANA_ORIGIN) ??
  trimOrigin(process.env.NEXT_PUBLIC_OBSERVABILITY_GRAFANA_URL);
const prometheusOrigin =
  trimOrigin(process.env.OBSERVABILITY_PROMETHEUS_ORIGIN) ??
  trimOrigin(process.env.NEXT_PUBLIC_OBSERVABILITY_PROMETHEUS_URL);
const apiMetricsOrigin =
  originFromUrl(process.env.OBSERVABILITY_API_METRICS_ORIGIN) ??
  originFromUrl(process.env.NEXT_PUBLIC_OBSERVABILITY_API_METRICS_URL) ??
  trimOrigin(process.env.NEXT_PUBLIC_API_URL);

const GRAFANA_SUBPATH = "/grafana-dashboard";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/how-it-works",
        destination: "/application-architecture",
        permanent: true,
      },
      {
        source: "/how-it-works/:path*",
        destination: "/application-architecture/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const rules: Array<{ source: string; destination: string }> = [];

    if (grafanaOrigin) {
      rules.push(
        {
          source: `${GRAFANA_SUBPATH}`,
          destination: `${grafanaOrigin}${GRAFANA_SUBPATH}/`,
        },
        {
          source: `${GRAFANA_SUBPATH}/:path*`,
          destination: `${grafanaOrigin}${GRAFANA_SUBPATH}/:path*`,
        },
      );
    }

    if (prometheusOrigin) {
      rules.push(
        {
          source: "/prometheus-dashboard",
          destination: `${prometheusOrigin}/`,
        },
        {
          source: "/prometheus-dashboard/:path*",
          destination: `${prometheusOrigin}/:path*`,
        },
      );
    }

    if (apiMetricsOrigin) {
      rules.push({
        source: "/booking-api-metrics",
        destination: `${apiMetricsOrigin}/metrics`,
      });
    }

    return rules;
  },
};

export default nextConfig;
