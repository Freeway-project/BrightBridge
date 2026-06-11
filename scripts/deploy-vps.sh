#!/usr/bin/env bash
# =============================================================================
# deploy-vps.sh
#
# Deploy the docker-compose stack in vps-stack/ from origin/main.
#   1. Pull main (force-sync)
#   2. docker compose pull (refresh app image)
#   3. Apply migrations one-shot
#   4. docker compose up -d (rolling restart of web)
#
# Replaces the PM2-based deploy.sh after the Supabase → bundled-Postgres
# cutover. Until cutover, deploy.sh still owns the live stack.
#
# Usage:
#   bash scripts/deploy-vps.sh
#   bash scripts/deploy-vps.sh --skip-pull
#   bash scripts/deploy-vps.sh --skip-migrate
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_DIR="$REPO_ROOT/vps-stack"
COMPOSE_FILE="$STACK_DIR/compose.yml"
ENV_FILE="$STACK_DIR/.env"

SKIP_PULL=false
SKIP_MIGRATE=false

for arg in "$@"; do
  case $arg in
    --skip-pull)    SKIP_PULL=true ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
  esac
done

log()  { echo "[deploy-vps] $*"; }
fail() { echo "[deploy-vps] ERROR: $*" >&2; exit 1; }

[ -f "$COMPOSE_FILE" ] || fail "Compose file missing: $COMPOSE_FILE"
[ -f "$ENV_FILE" ]     || fail ".env missing at $ENV_FILE (copy .env.template, fill in, then re-run)"

cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# 1. Pull origin/main (same force-sync semantics as deploy.sh)
# ---------------------------------------------------------------------------
if [ "$SKIP_PULL" = false ]; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  log "Fetching origin/main (currently on '$CURRENT_BRANCH')..."
  git fetch origin main
  git checkout -f main
  git reset --hard origin/main
  log "Now at origin/main. $(git log -1 --oneline)"
fi

# ---------------------------------------------------------------------------
# 2. Pull the latest app image
# ---------------------------------------------------------------------------
log "Pulling app image..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull web

# ---------------------------------------------------------------------------
# 3. Run migrations (one-shot)
# ---------------------------------------------------------------------------
if [ "$SKIP_MIGRATE" = false ]; then
  log "Running migrations..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" --profile migrate run --rm migrate
fi

# ---------------------------------------------------------------------------
# 4. Rolling restart of the stack
# ---------------------------------------------------------------------------
log "Bringing stack up..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# ---------------------------------------------------------------------------
# 5. Deploy marker (for observability dashboards / live-update detection)
# ---------------------------------------------------------------------------
git rev-parse HEAD > "$REPO_ROOT/.deployment-version"
log "Deploy complete. $(git log -1 --pretty='%h %s')"

# ---------------------------------------------------------------------------
# 6. Status
# ---------------------------------------------------------------------------
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
