#!/usr/bin/env bash
# =============================================================================
# backup-to-gdrive.sh
#
# Dump the LIVE production Postgres (custom format) and upload it to Google
# Drive via rclone. Designed to be run from cron every few minutes.
#
# Non-polluting by design:
#   - Deletes the local .dump after a SUCCESSFUL upload (keeps nothing locally).
#   - Keeps the local file only if the upload FAILS, so the next run can retry.
#   - flock guard: if a previous run is still going, this tick is skipped.
#   - pg_dump is read-only; one short session connection per run.
#
# Required environment (keep secrets in a root-owned file, NOT in git):
#   BACKUP_DATABASE_URL  Live-prod SESSION-mode URL (port 5432, NOT 6543).
#                        e.g. postgres://postgres.<ref>:<pwd>@<host>:5432/postgres?sslmode=require
#   RCLONE_REMOTE        rclone destination, e.g. gdrive:coursebridge-backups
#
# Optional environment:
#   BACKUP_DIR   Where to stage the dump (default: <repo>/backups, gitignored).
#   BACKUP_TZ    Timezone for the filename timestamp (default: America/Vancouver).
#   PG_DUMP_BIN  pg_dump binary (default: pg_dump). Must be v17+ for prod PG 17.
#   RCLONE_BIN   rclone binary (default: rclone).
#   LOCK_FILE    flock path (default: /tmp/coursebridge-backup.lock).
#   USE_DOCKER   Set to 1 to force the Docker postgres:17 fallback for pg_dump.
#
# Exit codes: 0 ok / skipped-by-lock · 2 bad config · 3 no pg_dump17|docker
#             4 dump failed · 5 dump empty · 6 upload failed (local kept)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
BACKUP_TZ="${BACKUP_TZ:-America/Vancouver}"
PG_DUMP_BIN="${PG_DUMP_BIN:-pg_dump}"
RCLONE_BIN="${RCLONE_BIN:-rclone}"
LOCK_FILE="${LOCK_FILE:-/tmp/coursebridge-backup.lock}"

log() { echo "[$(TZ="$BACKUP_TZ" date '+%Y-%m-%d %H:%M:%S %Z')] $*"; }
die() { log "ERROR: $1"; exit "${2:-1}"; }

# --- Resolve remote + connection -------------------------------------------
# Destination remote (override with RCLONE_REMOTE); defaults to the standard folder.
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:coursebridge-backups}"

# Connection: use BACKUP_DATABASE_URL if set; otherwise derive it from the
# repo's .env.prod — swap the transaction-pooler port 6543 -> session-mode 5432
# (pg_dump can't use 6543) and normalize the query to a plain sslmode=require.
if [ -z "${BACKUP_DATABASE_URL:-}" ]; then
  ENV_PROD="${ENV_PROD:-$ROOT_DIR/.env.prod}"
  [ -f "$ENV_PROD" ] || die "No BACKUP_DATABASE_URL set and $ENV_PROD not found." 2
  raw="$(grep -m1 '^DATABASE_URL=' "$ENV_PROD" | sed 's/^DATABASE_URL=//; s/^"//; s/"$//')"
  [ -n "$raw" ] || die "Could not read DATABASE_URL from $ENV_PROD." 2
  BACKUP_DATABASE_URL="$(printf '%s' "$raw" | sed 's/:6543/:5432/; s/[?].*/?sslmode=require/')"
fi

# pg_dump cannot use the transaction pooler (port 6543) — refuse it.
case "$BACKUP_DATABASE_URL" in
  *:6543/*|*:6543|*:6543\?*)
    die "Connection uses port 6543 (transaction pooler); pg_dump needs session mode 5432." 2 ;;
esac

# --- Single-instance guard --------------------------------------------------
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Previous backup still running; skipping this tick."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(TZ="$BACKUP_TZ" date '+%Y%m%d-%H%M%S')"
OUT="$BACKUP_DIR/prod-${STAMP}-PT.dump"

# --- Run pg_dump (native v17+, or Docker fallback) --------------------------
run_dump() {
  local major=0
  if [ "${USE_DOCKER:-0}" != "1" ] && command -v "$PG_DUMP_BIN" >/dev/null 2>&1; then
    major="$("$PG_DUMP_BIN" --version 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo 0)"
  fi

  if [ "${major:-0}" -ge 17 ]; then
    "$PG_DUMP_BIN" -Fc --no-owner --no-privileges -d "$BACKUP_DATABASE_URL" -f "$OUT"
  elif command -v docker >/dev/null 2>&1; then
    log "Using Docker postgres:17 for pg_dump (local client is v${major:-?})."
    # --user keeps the dump file owned by the cron user so local cleanup works.
    docker run --rm --user "$(id -u):$(id -g)" -v "$BACKUP_DIR:/backups" postgres:17 \
      pg_dump -Fc --no-owner --no-privileges -d "$BACKUP_DATABASE_URL" -f "/backups/$(basename "$OUT")"
  else
    die "Need pg_dump 17+ (prod is PG 17) or Docker. Install postgresql-client-17 or set USE_DOCKER=1." 3
  fi
}

log "Dumping live prod -> $OUT"
if ! run_dump; then
  rm -f "$OUT"
  die "pg_dump failed; nothing uploaded." 4
fi
[ -s "$OUT" ] || { rm -f "$OUT"; die "Dump file is empty; aborting upload." 5; }
log "Dump OK ($(du -h "$OUT" | cut -f1)). Uploading to $RCLONE_REMOTE"

# --- Upload, then clean up locally ------------------------------------------
if "$RCLONE_BIN" copy "$OUT" "$RCLONE_REMOTE" --no-traverse; then
  rm -f "$OUT"
  log "Upload OK; local file removed. Done."
else
  log "Upload FAILED; keeping local file for retry: $OUT"
  exit 6
fi
