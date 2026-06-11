#!/usr/bin/env bash
# =============================================================================
# autodeploy.sh  —  runs as a PM2 process, polls every 5 minutes
# Deploys only when origin/main has commits the local repo doesn't have.
# =============================================================================

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCKFILE="/tmp/brightbridge-deploy.lock"
PAUSEFILE="${AUTODEPLOY_PAUSEFILE:-/tmp/brightbridge-autodeploy.paused}"
LOGFILE="/var/log/pm2/brightbridge-autodeploy.log"
INTERVAL=60  # seconds between polls

# Which deploy script to run. Defaults to the PM2-based one; flip to
# scripts/deploy-vps.sh after the docker cutover.
DEPLOY_SCRIPT="${AUTODEPLOY_SCRIPT:-scripts/deploy.sh}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"; }

log "Autodeploy watcher started. Polling every ${INTERVAL}s. Pause: \`touch $PAUSEFILE\`. Deploy script: $DEPLOY_SCRIPT."

while true; do
  cd "$REPO_ROOT"

  # Operator pause — `touch $PAUSEFILE` halts deploys without killing the
  # watcher; `rm $PAUSEFILE` resumes. Lets us merge to main during a planned
  # cutover without firing a half-broken deploy.
  if [ -f "$PAUSEFILE" ]; then
    sleep "$INTERVAL"
    continue
  fi

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

  touch "$LOCKFILE"

  # ---------------------------------------------------------------------------
  # Pre-deploy production backup, tagged with the commit (and PR if the merge
  # subject carries one, e.g. "...(#111)"). Gives a named rollback point per
  # deploy: backups/prod-full-<ts>-<shortsha>[-pr<NN>].dump.
  #
  # A failed backup aborts THIS poll's deploy (lockfile cleared, not marked
  # deployed) so the same commit is retried next poll — never deploy a schema
  # change with no fresh rollback point. Set AUTODEPLOY_BACKUP_OPTIONAL=1 to
  # downgrade backup failure to a warning and deploy anyway.
  # ---------------------------------------------------------------------------
  SHORT_SHA="${REMOTE:0:7}"
  SUBJECT="$(git log -1 --pretty='%s' "$REMOTE" 2>/dev/null || true)"
  PR_NUM="$(echo "$SUBJECT" | grep -oE '#[0-9]+' | head -1 | tr -d '#')"
  if [ -n "$PR_NUM" ]; then
    DEPLOY_TAG="${SHORT_SHA}-pr${PR_NUM}"
  else
    DEPLOY_TAG="$SHORT_SHA"
  fi

  log "Backing up production DB before deploy (tag: ${DEPLOY_TAG})..."
  if BACKUP_TAG="$DEPLOY_TAG" bash "$REPO_ROOT/scripts/backup-db.sh" --prod >> "$LOGFILE" 2>&1; then
    log "Backup succeeded (tag: ${DEPLOY_TAG})."
  else
    if [ "${AUTODEPLOY_BACKUP_OPTIONAL:-0}" = "1" ]; then
      log "Backup FAILED — AUTODEPLOY_BACKUP_OPTIONAL=1, deploying anyway."
    else
      log "Backup FAILED — aborting this deploy. Will retry next poll. (Set AUTODEPLOY_BACKUP_OPTIONAL=1 to override.)"
      rm -f "$LOCKFILE"
      sleep "$INTERVAL"
      continue
    fi
  fi

  log "Starting deploy ($DEPLOY_SCRIPT)..."
  bash "$REPO_ROOT/$DEPLOY_SCRIPT" >> "$LOGFILE" 2>&1
  EXIT_CODE=$?
  rm -f "$LOCKFILE"

  if [ $EXIT_CODE -eq 0 ]; then
    log "Deploy succeeded."
  else
    log "Deploy FAILED (exit $EXIT_CODE). Check $LOGFILE for details."
  fi

  sleep "$INTERVAL"
done
