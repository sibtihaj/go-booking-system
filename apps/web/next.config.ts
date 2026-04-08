import type { NextConfig } from "next";

/**
 * Observability reverse-proxy paths (Vercel rewrites → external origins).
 *
 * - /grafana-dashboard → OBSERVABILITY_GRAFANA_ORIGIN with path /grafana-dashboard/...
 *   Grafana must be configured with GF_SERVER_ROOT_URL=https://<your-vercel-domain>/grafana-dashboard
 *   and GF_SERVER_SERVE_FROM_SUB_PATH=true so it serves under that path on the upstream host.
 *
 * - /prometheus-dashboard → OBSERVABILITY_PROMETHEUS_ORIGIN (Prometheus UI is usually at /graph).
 *
 * - /booking-api-metrics → Go API GET /metrics (raw Prometheus text). Prefer network restrictions
 *   or auth in production; this exposes operational detail on your public app domain when enabled.
 */
function trimOrigin(value: string | undefined): string | undefined {
  const t = value?.trim();
  if (!t) return undefined;
  return t.replace(/\/$/, "");
}

const grafanaOrigin = trimOrigin(process.env.OBSERVABILITY_GRAFANA_ORIGIN);
const prometheusOrigin = trimOrigin(process.env.OBSERVABILITY_PROMETHEUS_ORIGIN);
const apiMetricsOrigin =
  trimOrigin(process.env.OBSERVABILITY_API_METRICS_ORIGIN) ??
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
