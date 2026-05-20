#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${1:-brightbridge}"
APP_URL="${APP_URL:-http://127.0.0.1:3000/api/version}"
LOG_LINES="${LOG_LINES:-40}"

section() {
  printf '\n== %s ==\n' "$1"
}

section "PM2 process"
pm2 describe "$APP_NAME" || {
  printf 'PM2 app "%s" was not found.\n' "$APP_NAME" >&2
  exit 1
}

section "PM2 list"
pm2 list

section "Host load"
uptime

section "Memory"
free -h

section "Disk"
df -h /

section "App health"
if command -v curl >/dev/null 2>&1; then
  curl --fail --silent --show-error --max-time 5 "$APP_URL" || {
    printf '\nHealth check failed for %s\n' "$APP_URL" >&2
  }
  printf '\n'
else
  printf 'curl is not installed; skipped %s\n' "$APP_URL"
fi

section "Recent PM2 logs"
pm2 logs "$APP_NAME" --lines "$LOG_LINES" --nostream
