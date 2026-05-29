#!/usr/bin/env bash
# =============================================================================
# deploy.sh
#
# Clean deploy from main:
#   1. Pull latest main
#   2. Install dependencies
#   3. Clean Next.js build cache
#   4. Build all packages
#   5. Reload PM2 (zero-downtime)
#
# Usage:
#   bash scripts/deploy.sh
#   bash scripts/deploy.sh --skip-pull    # skip git pull (local build only)
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_PULL=false

for arg in "$@"; do
  case $arg in
    --skip-pull) SKIP_PULL=true ;;
  esac
done

log()  { echo "[deploy] $*"; }
fail() { echo "[deploy] ERROR: $*" >&2; exit 1; }

cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# 1. Pull main
# ---------------------------------------------------------------------------
if [ "$SKIP_PULL" = false ]; then
  log "Checking out and pulling main..."
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [ "$CURRENT_BRANCH" != "main" ]; then
    log "Currently on '$CURRENT_BRANCH' — switching to main"
    git checkout main
  fi
  git checkout -- .
  git pull origin main
  log "Git pull complete. $(git log -1 --oneline)"
fi

# ---------------------------------------------------------------------------
# 2. Install dependencies
# ---------------------------------------------------------------------------
log "Installing dependencies..."
npm install --frozen-lockfile

# ---------------------------------------------------------------------------
# 3. Clean Next.js build cache
# ---------------------------------------------------------------------------
log "Cleaning Next.js build cache..."
rm -rf apps/web/.next

# Also clear turbo cache so the web build runs fresh
if command -v turbo &>/dev/null; then
  turbo clean --filter=@coursebridge/web 2>/dev/null || true
else
  node_modules/.bin/turbo clean --filter=@coursebridge/web 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# 4. Build
# ---------------------------------------------------------------------------
log "Building..."
npm run build

# ---------------------------------------------------------------------------
# 4b. Write deploy marker (watched at runtime for live update detection)
# ---------------------------------------------------------------------------
# Write in place (redirect, not mv) so the running server's fs.watch — which
# tracks the file's inode — fires reliably. Doing this right before the reload
# means a still-alive old process pushes the new version to connected clients.
log "Writing deploy marker..."
git rev-parse HEAD > "$REPO_ROOT/apps/web/.deployment-version"

# ---------------------------------------------------------------------------
# 5. Reload PM2
# ---------------------------------------------------------------------------
if pm2 id brightbridge &>/dev/null; then
  log "Reloading PM2 process 'brightbridge'..."
  pm2 reload brightbridge
  pm2 list
else
  log "PM2 process 'brightbridge' not found — starting fresh..."
  pm2 start ecosystem.config.cjs --env production
  pm2 save
fi

log "Deploy complete."
