#!/usr/bin/env bash
# =============================================================================
# autodeploy.sh  —  runs as a PM2 process, polls every 5 minutes
# Deploys only when origin/main has commits the local repo doesn't have.
# =============================================================================

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCKFILE="/tmp/brightbridge-deploy.lock"
LOGFILE="/var/log/pm2/brightbridge-autodeploy.log"
INTERVAL=60  # seconds between polls

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"; }

log "Autodeploy watcher started. Polling every ${INTERVAL}s."

while true; do
  cd "$REPO_ROOT"

  # Skip if a deploy is already running
  if [ -f "$LOCKFILE" ]; then
    log "Deploy in progress (lockfile). Skipping this poll."
    sleep "$INTERVAL"
    continue
  fi

  # Fetch quietly
  if ! git fetch origin main --quiet 2>>"$LOGFILE"; then
    log "git fetch failed — check network/auth. Retrying next poll."
    sleep "$INTERVAL"
    continue
  fi

  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main)

  if [ "$LOCAL" = "$REMOTE" ]; then
    sleep "$INTERVAL"
    continue
  fi

  log "New commits on main: ${LOCAL:0:7} → ${REMOTE:0:7}"
  log "Starting deploy..."

  touch "$LOCKFILE"
  bash "$REPO_ROOT/scripts/deploy.sh" >> "$LOGFILE" 2>&1
  EXIT_CODE=$?
  rm -f "$LOCKFILE"

  if [ $EXIT_CODE -eq 0 ]; then
    log "Deploy succeeded."
  else
    log "Deploy FAILED (exit $EXIT_CODE). Check $LOGFILE for details."
  fi

  sleep "$INTERVAL"
done
