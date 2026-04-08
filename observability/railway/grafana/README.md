# Railway Grafana Image (Preprovisioned)

This image packages Grafana with:

- Provisioned Prometheus datasource
- Provisioned `Go Booking API` dashboard

## Required environment variables

- `PROMETHEUS_URL` (example: `http://go-booking-prometheus.railway.internal:9090`)
- `GF_SECURITY_ADMIN_USER` (example: `admin`)
- `GF_SECURITY_ADMIN_PASSWORD` (example: `admin`)
- `GF_SERVER_ROOT_URL` (set to your public Grafana URL)
- `GF_SERVER_SERVE_FROM_SUB_PATH` (`false` unless you intentionally serve from a path prefix)

## Local image build (optional)

```bash
docker build -t ib-scheduling-grafana:latest .
```

Run this from `observability/railway/grafana`.

