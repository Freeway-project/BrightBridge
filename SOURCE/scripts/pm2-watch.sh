#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${1:-brightbridge}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-5}"
APP_URL="${APP_URL:-http://127.0.0.1:3000/api/version}"
TOP_COUNT="${TOP_COUNT:-12}"

clear_screen() {
  printf '\033[2J\033[H'
}

print_section() {
  printf '\n== %s ==\n' "$1"
}

while true; do
  clear_screen
  printf 'BrightBridge live monitor | app=%s | refresh=%ss | %s\n' \
    "$APP_NAME" "$INTERVAL_SECONDS" "$(date '+%Y-%m-%d %H:%M:%S %Z')"

  print_section "Host load"
  uptime

  print_section "Memory"
  free -h

  print_section "Disk"
  df -h /

  print_section "PM2"
  pm2 list

  print_section "App health"
  if command -v curl >/dev/null 2>&1; then
    curl --fail --silent --show-error --max-time 5 "$APP_URL" || true
    printf '\n'
  else
    printf 'curl is not installed; skipped %s\n' "$APP_URL"
  fi

  print_section "Top CPU processes"
  ps -eo pid,ppid,user,pcpu,pmem,comm,args --sort=-pcpu | head -n "$((TOP_COUNT + 1))"

  print_section "Top memory processes"
  ps -eo pid,ppid,user,pcpu,pmem,comm,args --sort=-pmem | head -n "$((TOP_COUNT + 1))"

  print_section "Recent app logs"
  pm2 logs "$APP_NAME" --lines 8 --nostream || true

  sleep "$INTERVAL_SECONDS"
done
