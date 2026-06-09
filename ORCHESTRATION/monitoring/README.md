# CourseBridge Monitoring Stack

Prometheus + Grafana + node-exporter + postgres-exporter, deployed as a
Docker Swarm stack alongside the app on the same Azure VM(s) running the
existing CourseBridge swarm.

## What runs

| Service             | Image                                              | Purpose                                  |
|---------------------|----------------------------------------------------|------------------------------------------|
| `prometheus`        | `prom/prometheus:v2.55.0`                          | Scrape + store metrics (30d retention)   |
| `grafana`           | `grafana/grafana:11.3.0`                           | Dashboards (5 provisioned)               |
| `node-exporter`     | `prom/node-exporter:v1.8.2`                        | Host CPU/mem/disk/net (global mode)      |
| `postgres-exporter` | `quay.io/prometheuscommunity/postgres-exporter:v0.16.0` | DB stats from Azure Postgres        |

All services attach to the existing external overlay network `swarm-network`,
so Prometheus reaches the app at `coursebridge-test:3000` via Swarm DNS.

## Required env vars

Create `.env` in this directory (`ORCHESTRATION/monitoring/.env`, not
committed):

```env
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=<strong-password>
GF_SERVER_ROOT_URL=https://<grafana-host>
GRAFANA_HOST=grafana.<your-azure-domain>
PROMETHEUS_HOST=prometheus.<your-azure-domain>
POSTGRES_EXPORTER_DSN=postgresql://monitoring_ro:<password>@<azure-pg-host>:5432/postgres?sslmode=require
```

Also set on the app stack so it knows the scrape token:

```env
METRICS_BEARER_TOKEN=<long-random-token>
```

## Bearer token secret

Prometheus authenticates to `/api/metrics` with a bearer token mounted as a
Swarm secret. Generate it once and write it to a file the stack will read:

```bash
mkdir -p ORCHESTRATION/monitoring/secrets
openssl rand -hex 32 > ORCHESTRATION/monitoring/secrets/metrics_token
chmod 0400 ORCHESTRATION/monitoring/secrets/metrics_token
```

Set the same value as `METRICS_BEARER_TOKEN` in the app's `.env`.

## Postgres exporter role

Azure Database for PostgreSQL: create a read-only monitoring role.

```sql
CREATE USER monitoring_ro WITH ENCRYPTED PASSWORD '<password>';
GRANT pg_monitor TO monitoring_ro;
```

Then put the DSN in `.env` as `POSTGRES_EXPORTER_DSN`. Use `sslmode=require`
for Azure Postgres.

## Deploy

From the Swarm manager node on the Azure VM:

```bash
cd ORCHESTRATION/monitoring
docker stack deploy -c compose-monitoring.yml monitoring
```

Verify:

```bash
docker stack services monitoring
docker service logs monitoring_prometheus --tail 50
```

## Access Grafana

The compose file exposes Grafana via Traefik on `${GRAFANA_HOST}` behind the
`ip-allow-admin@file` middleware (same pattern as the app stack). Ensure
the DNS record points at the Azure VM and the IP allowlist file lists your
admin source ranges.

To reach Grafana without Traefik (e.g., during initial setup), port-forward:

```bash
docker exec -it $(docker ps -q -f name=monitoring_grafana) sh
# or from your laptop, after SSH to the Azure VM:
ssh -L 3001:localhost:3000 user@<azure-vm> # then visit http://localhost:3001
```

Initial login uses `GF_SECURITY_ADMIN_USER` / `GF_SECURITY_ADMIN_PASSWORD`.
Dashboards under `CourseBridge` folder are provisioned from
`grafana/dashboards/`; the Prometheus datasource is provisioned from
`grafana/provisioning/datasources/`.

## Prometheus

Not exposed externally by default. Enable the commented Traefik labels in
`compose-monitoring.yml` only if you genuinely need an external URL —
otherwise port-forward.

Data lives in the `prometheus_data` named volume on the manager node
(retention 30d). For longer retention, attach an Azure managed disk and
remap the volume.

## Layout

```
monitoring/
  compose-monitoring.yml          # the Swarm stack
  prometheus.yml                  # scrape config
  rules/                          # alerting rules (empty in v1)
  secrets/metrics_token           # bearer token (gitignored — create locally)
  grafana/
    provisioning/
      datasources/prometheus.yml  # Prometheus datasource (uid: prometheus)
      dashboards/dashboards.yml   # dashboard provider
    dashboards/                   # 5 dashboards JSON
```
