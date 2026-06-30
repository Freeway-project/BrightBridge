# Runbook: 5-minute prod backups to Google Drive

Scheduled `pg_dump` of the **live** production database, uploaded to Google Drive
via `rclone`. Runs from your server's crontab every 5 minutes, weekdays, 8am–5pm
Pacific.

- **Script:** `scripts/backup-to-gdrive.sh` (parameterized; secrets stay on the host)
- **Live prod target:** project ref `ytmscglilbkmrlstvjhy`, host
  `aws-1-us-east-1.pooler.supabase.com`, **session mode port 5432** (NOT 6543 —
  the transaction pooler breaks `pg_dump`).

> ⚠️ Do **not** use `backup-db.sh --prod` for this. It resolves to
> `.env.mirror`'s `PROD_DATABASE_URL` (`zgqepddmqgtoeczwoetx`), which is a
> *different* database, not live prod.

---

## 1. Install prerequisites (on the cron host)

```bash
# Postgres client 17 (prod is PG 17.6; older clients fail with a version mismatch)
# Debian/Ubuntu:
sudo install -d /usr/share/postgresql-common/pgdg
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg
sudo apt-get update && sudo apt-get install -y postgresql-client-17

# rclone
sudo -v ; curl https://rclone.org/install.sh | sudo bash
```

*No pg_dump 17?* Skip it and set `USE_DOCKER=1` in the env file below; the script
will run `pg_dump` inside `postgres:17` via Docker.

## 2. Authorize rclone to Google Drive (you must do this — it's your login)

```bash
rclone config
#  n) New remote
#  name> gdrive
#  Storage> drive
#  client_id / client_secret> (blank is fine)
#  scope> 1  (full access) or 2 (drive.file)
#  Use auto config> Y on a desktop (browser opens), or N on a headless box
#     and follow the `rclone authorize "drive"` copy/paste flow.
rclone mkdir gdrive:coursebridge-backups        # create the destination folder
rclone lsd  gdrive:                              # verify it worked
```

## 3. Put the secret on the host (root-owned, never in git)

```bash
sudo install -d -m 700 /etc/coursebridge
sudo tee /etc/coursebridge/backup.env >/dev/null <<'EOF'
BACKUP_DATABASE_URL=postgres://postgres.ytmscglilbkmrlstvjhy:<PASSWORD>@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
RCLONE_REMOTE=gdrive:coursebridge-backups
# USE_DOCKER=1   # uncomment if you didn't install postgresql-client-17
EOF
sudo chmod 600 /etc/coursebridge/backup.env
```

`<PASSWORD>` is the same one already in this repo's `.env.prod` runtime URL —
just change the port from `6543` to `5432`. If it contains reserved characters
(`@ : / $`), percent-encode them.

## 4. Verify a one-off run before scheduling

```bash
set -a; source /etc/coursebridge/backup.env; set +a
/path/to/repo/scripts/backup-to-gdrive.sh
rclone ls gdrive:coursebridge-backups | tail   # confirm a .dump landed
```

## 5. Install the crontab

```cron
CRON_TZ=America/Vancouver
*/5 8-17 * * 1-5  . /etc/coursebridge/backup.env; /path/to/repo/scripts/backup-to-gdrive.sh >> /var/log/coursebridge-backup.log 2>&1
```

- `CRON_TZ=America/Vancouver` handles PDT/PST automatically (Vixie/cronie). If
  your cron doesn't support it, set the host timezone to Pacific instead.
- `*/5 8-17` fires every 5 min from **08:00 to 17:55**. To stop at 17:00 sharp,
  use two lines: `*/5 8-16 * * 1-5` and `0 17 * * 1-5`.

---

## Operational notes

- **Storage growth:** keep-everything at this cadence is ~108 dumps/day
  (≈1 GB/day depending on dump size). Make sure the Drive has room. To switch to
  a rolling window later, add an `rclone delete --min-age 7d` line — ask and I'll
  wire it into the script.
- **Log rotation:** `/var/log/coursebridge-backup.log` grows over time. Add a
  `logrotate` rule (weekly, keep 4) so it doesn't bloat.
- **Failure behavior:** on upload failure the local `.dump` is kept for the next
  run to retry; on success it's deleted. `flock` skips a tick if the previous
  run is still going.
- **Load:** `pg_dump` reads the whole live DB every 5 min during business hours.
  At current size (~2.4k courses) this is seconds, but it hits the live instance.
