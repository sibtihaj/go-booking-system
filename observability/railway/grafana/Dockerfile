FROM grafana/grafana:11.3.0

# Provisioning + dashboards from repository so Railway deploy matches local setup.
COPY provisioning /etc/grafana/provisioning
COPY dashboards /var/lib/grafana/dashboards

