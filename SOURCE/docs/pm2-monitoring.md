# Simple PM2 Monitoring

This is the lightweight production check for the `brightbridge` PM2 service.

## One-Shot Status

Run this on the server:

```bash
bash scripts/pm2-monitor.sh
```

It prints:

- PM2 process details
- PM2 list with CPU and memory
- host load average
- host memory
- root disk usage
- `/api/version` health check
- recent PM2 logs

To check a different PM2 process name:

```bash
bash scripts/pm2-monitor.sh brightbridge
```

To change the health URL or log length:

```bash
APP_URL=http://127.0.0.1:3000/api/version LOG_LINES=100 bash scripts/pm2-monitor.sh
```

## Live Monitoring

For a simple always-refreshing terminal view:

```bash
bash scripts/pm2-watch.sh
```

It shows PM2 status, server load, memory, disk, app health, recent logs, and the highest CPU/memory processes. Stop it with `Ctrl+C`.

To refresh every 2 seconds:

```bash
INTERVAL_SECONDS=2 bash scripts/pm2-watch.sh
```

For live CPU and memory:

```bash
pm2 monit
```

For quick status:

```bash
pm2 status
```

For logs:

```bash
pm2 logs brightbridge --lines 100
```

For restart history and process details:

```bash
pm2 describe brightbridge
```

## Rebuild And Restart

After pulling changes on the server:

```bash
npm run build
pm2 restart brightbridge --update-env
```

Then watch it come back up:

```bash
bash scripts/pm2-watch.sh
```

## What To Watch

- `status`: should be `online`
- `restarts`: increasing restarts mean the app is crashing or hitting the memory limit
- `cpu`: short spikes are normal; sustained high CPU needs investigation
- `memory`: this service restarts at `1G` from `ecosystem.config.cjs`
- host `load average`: sustained load above CPU core count means the server is overloaded
- disk `/`: keep enough free space for logs and builds

## Optional Cron Snapshot

To write a periodic snapshot:

```bash
*/5 * * * * cd /mnt/external/BrightBridge && bash scripts/pm2-monitor.sh >> /var/log/pm2/brightbridge-monitor.log 2>&1
```

Use this only if the server has enough log rotation in place.
