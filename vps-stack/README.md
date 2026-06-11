# CourseBridge VPS Stack

Self-hosted docker-compose stack that replaces the existing PM2 deploy.
Bundles the web app, Postgres, and Prometheus+Grafana monitoring in one place.

**No Supabase. No Swarm. No Azure.** Plain `docker compose up -d`.

## Layout

```
vps-stack/
├── compose.yml                              # everything
├── .env.template                            # copy to .env, fill in
├── prometheus/
│   ├── prometheus.yml                       # scrape config (web, node, postgres)
│   └── metrics_token                        # bearer token for /api/metrics (NOT committed)
└── grafana/
    └── provisioning/datasources/prometheus.yml
```

## First-time setup on the VPS

```bash
# 1. Get the stack
git clone <repo> && cd vps-stack

# 2. Configure
cp .env.template .env
$EDITOR .env                                 # fill POSTGRES_PASSWORD, SESSION_SECRET, AZURE_OIDC_*, METRICS_BEARER_TOKEN, GRAFANA_ADMIN_PASSWORD

# 3. Wire the metrics bearer token so Prometheus can scrape the app
echo -n "$METRICS_BEARER_TOKEN_VALUE" > prometheus/metrics_token
chmod 600 prometheus/metrics_token

# 4. Bring up Postgres first, then run migrations
docker compose up -d postgres
docker compose --profile migrate run --rm migrate

# 5. Bring up the rest
docker compose up -d
```

## Daily ops

```bash
docker compose pull && docker compose up -d     # update to latest image
docker compose logs -f web                       # tail app logs
docker compose ps                                # status
docker compose exec postgres psql -U coursebridge_user coursebridge   # psql in
```

## Backups

```bash
# manual dump
docker compose exec postgres pg_dump -U coursebridge_user coursebridge \
  | gzip > backups/cb-$(date +%F-%H%M).sql.gz
```

Mount `./backups` is already wired into the Postgres container, so you can also
run `pg_dump` from inside the container writing to `/backups/...`. Schedule via
host cron.

## Ports exposed on the VPS

| Service     | Port              | Purpose            |
|-------------|-------------------|--------------------|
| web         | `${WEB_PORT}`     | App (put nginx/caddy in front for TLS) |
| grafana     | `${GRAFANA_PORT}` | Dashboards (admin login) |
| prometheus  | `${PROMETHEUS_PORT}` | Metrics (firewall to ops IPs) |

Postgres, postgres-exporter, and node-exporter stay on the internal docker
network — not exposed to the host.

## When Azure is ready

This stack is intentionally independent. The `ORCHESTRATION/` flow (Swarm +
Traefik + external Postgres) keeps working. Cut over by repointing DNS; no
changes needed in this stack.
