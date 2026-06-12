# CourseBridge VPS Stack

Self-hosted docker-compose stack that replaces the existing PM2 deploy.
Bundles the web app, Postgres, and Prometheus+Grafana monitoring in one place.

**No Supabase. No Swarm. No Azure.** Plain `docker compose up -d`.

## Services

| Service              | Image                                 | Purpose                                          |
|----------------------|---------------------------------------|--------------------------------------------------|
| `web`                | `okanagan/coursebridge:latest`        | Next.js app (port `${WEB_PORT}`)                 |
| `postgres`           | `postgres:16`                         | Primary database, internal-only                  |
| `migrate` (profile)  | same as `web`                         | One-shot migration runner                        |
| `prometheus`         | `prom/prometheus`                     | Metrics scraper (port `${PROMETHEUS_PORT}`)      |
| `grafana`            | `grafana/grafana`                     | Dashboards (port `${GRAFANA_PORT}`)              |
| `node-exporter`      | `prom/node-exporter`                  | Host metrics, internal-only                      |
| `postgres-exporter`  | `prometheuscommunity/postgres-exporter` | DB metrics, internal-only                      |
| `backup`             | `prodrigestivill/postgres-backup-local:16` | **Automatic `pg_dump` on cron + rotation**  |

## Layout

```
vps-stack/
├── compose.yml                                 # all services
├── .env.template                               # copy to .env, fill in
├── backups/                                    # rotated pg_dump output (host-mounted)
├── prometheus/
│   ├── prometheus.yml                          # scrape config
│   └── metrics_token                           # /api/metrics bearer (NOT committed)
└── grafana/
    └── provisioning/datasources/prometheus.yml
```

## First-time setup on the VPS

```bash
# 1. Get the stack
git clone <repo> && cd vps-stack

# 2. Configure
cp .env.template .env
$EDITOR .env                                 # fill POSTGRES_PASSWORD, SESSION_SECRET, EMAIL_*, METRICS_BEARER_TOKEN, GRAFANA_ADMIN_PASSWORD

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

**Automatic** — the `backup` service runs `pg_dump` on `BACKUP_SCHEDULE`
(default `@daily`) and rotates dumps with daily / weekly / monthly retention
into `./backups/`. Configure via `.env`:

```bash
BACKUP_SCHEDULE=@daily          # cron (`30 2 * * *`) or shortcut (`@daily`, `@hourly`)
BACKUP_KEEP_DAYS=14
BACKUP_KEEP_WEEKS=4
BACKUP_KEEP_MONTHS=6
```

```bash
# inspect what's been written
ls -lh backups/daily/ backups/weekly/ backups/monthly/

# force one immediately (don't wait for cron)
docker compose exec backup /backup.sh

# manual ad-hoc dump
docker compose exec postgres pg_dump -U coursebridge_user coursebridge \
  | gzip > backups/manual-$(date +%F-%H%M).sql.gz

# restore from a dump
gunzip -c backups/daily/coursebridge-DATE.sql.gz \
  | docker compose exec -T postgres psql -U coursebridge_user coursebridge
```

**Recommended:** mirror `./backups/` off-host nightly (rsync to S3/B2/another
VPS). The local volume protects against accidental drops but not against host
loss.

## Ports exposed on the VPS

| Service     | Port              | Purpose            |
|-------------|-------------------|--------------------|
| web         | `${WEB_PORT}`     | App (put nginx/caddy in front for TLS) |
| grafana     | `${GRAFANA_PORT}` | Dashboards (admin login) |
| prometheus  | `${PROMETHEUS_PORT}` | Metrics (firewall to ops IPs) |

Postgres, postgres-exporter, and node-exporter stay on the internal docker
network — not exposed to the host.

