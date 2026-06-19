#!/usr/bin/env bash

set -euo pipefail

# Standalone Postgres backup script for Supabase.
# Intended to be triggered by cron every 5 minutes on weekdays.

PROJECT_ROOT="/mnt/data/projects/BrightBridge"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env.prod}"
DATABASE_URL="${DATABASE_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/.backups/supabase}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TZ_NAME="${TZ_NAME:-UTC}"
LOG_FILE="${LOG_FILE:-$BACKUP_DIR/backup.log}"
FORCE_RUN="${FORCE_RUN:-0}"
PG_DUMP_BIN="${PG_DUMP_BIN:-pg_dump}"
PG_DUMP_DOCKER_IMAGE="${PG_DUMP_DOCKER_IMAGE:-postgres:17}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

if [[ -n "${POSTGRES_URL_NON_POOLING:-}" ]]; then
  DATABASE_URL="$POSTGRES_URL_NON_POOLING"
elif [[ -n "${POSTGRES_URL:-}" ]]; then
  DATABASE_URL="$POSTGRES_URL"
fi

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is required. Checked ENV_FILE=$ENV_FILE." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

export TZ="$TZ_NAME"

weekday="$(date +%u)"
hour_minute="$(date +%H%M)"
hour_minute_num=$((10#$hour_minute))
timestamp="$(date +%Y-%m-%d_%H-%M-%S)"
backup_file="$BACKUP_DIR/supabase_$timestamp.dump"
lock_file="$BACKUP_DIR/.backup.lock"

if [[ "$FORCE_RUN" != "1" ]]; then
  # Run only Monday-Friday, 08:00:00 through 15:59:59.
  # Use cron to trigger at 16:00 separately if you need that exact final run.
  if [[ "$weekday" -gt 5 ]]; then
    exit 0
  fi

  if (( hour_minute_num < 800 || hour_minute_num >= 1600 )); then
    exit 0
  fi
fi

run_pg_dump() {
  if command -v "$PG_DUMP_BIN" >/dev/null 2>&1; then
    local major
    major="$($PG_DUMP_BIN --version | sed -E 's/.*\) ([0-9]+)(\.[0-9]+)?.*/\1/' | head -n1)"
    if [[ "$major" == "17" ]]; then
      "$PG_DUMP_BIN" \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-privileges \
        --file="$backup_file" \
        "$DATABASE_URL"
      return
    fi
  fi

  docker run --rm \
    -v "$BACKUP_DIR:/backup" \
    "$PG_DUMP_DOCKER_IMAGE" \
    pg_dump \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    --file="/backup/$(basename "$backup_file")" \
    "$DATABASE_URL"
}

exec 9>"$lock_file"
if ! flock -n 9; then
  echo "$(date -Is) skipped: previous backup still running" >> "$LOG_FILE"
  exit 0
fi

echo "$(date -Is) starting backup: $backup_file" >> "$LOG_FILE"

if run_pg_dump
then
  echo "$(date -Is) completed backup: $backup_file" >> "$LOG_FILE"
else
  echo "$(date -Is) failed backup" >> "$LOG_FILE"
  rm -f "$backup_file"
  exit 1
fi

find "$BACKUP_DIR" -type f -name 'supabase_*.dump' -mtime +"$RETENTION_DAYS" -delete
