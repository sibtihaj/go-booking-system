FROM prom/prometheus:v2.55.1

COPY prometheus.yml /etc/prometheus/prometheus.yml

# Railway attached volumes can be owned by a different UID/GID than Prometheus expects.
# Use a writable path to avoid startup panic on queries.active mmap file.
CMD ["--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/tmp/prometheus"]

