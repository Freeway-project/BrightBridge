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
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  log "Fetching origin/main (currently on '$CURRENT_BRANCH')..."
  git fetch origin main
  # Force-switch to main and hard-reset to the remote tip. Local modifications to
  # tracked files are discarded FIRST (via -f / reset --hard) so a dirty working
  # tree — generated files like next-env.d.ts, or leftover edits — can't abort the
  # switch. The old order (`git checkout main` BEFORE `git checkout -- .`) aborted
  # on any dirty tracked file and left autodeploy stuck failing every poll.
  # This box deploys main; local tracked changes here are expendable.
  git checkout -f main
  git reset --hard origin/main
  log "Now at origin/main. $(git log -1 --oneline)"
fi

# ---------------------------------------------------------------------------
# 2. Install dependencies
# ---------------------------------------------------------------------------
log "Installing dependencies..."
npm install --frozen-lockfile

# ---------------------------------------------------------------------------
# 3. Clean previous staged build (NOT the live .next)
# ---------------------------------------------------------------------------
# We build into a staging dir and atomically swap it into place AFTER the build
# succeeds. The live `.next` is left untouched during the build so the running
# server never serves against a half-built dir (which caused ChunkLoadError
# crash loops — Turbopack chunk hashes change every build).
# DIST_NAME is relative to apps/web (next's cwd, where distDir resolves).
# The *_DIR paths are repo-root-relative for the swap below.
DIST_NAME=".next-build"
BUILD_DIR="apps/web/.next-build"
LIVE_DIR="apps/web/.next"
OLD_DIR="apps/web/.next-old"

log "Cleaning previous staged build..."
rm -rf "$REPO_ROOT/$BUILD_DIR" "$REPO_ROOT/$OLD_DIR"

# Clear turbo cache so the web build runs fresh
if command -v turbo &>/dev/null; then
  turbo clean --filter=@coursebridge/web 2>/dev/null || true
else
  node_modules/.bin/turbo clean --filter=@coursebridge/web 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# 4. Build into the staging dir
# ---------------------------------------------------------------------------
log "Building into $BUILD_DIR..."
# TURBO_FORCE bypasses the turbo cache for this build. Without it, a cache HIT
# restores outputs to turbo's recorded dir (.next), NOT $DIST_NAME, so the
# staged dir is never materialized and the swap below fails (mv: cannot stat
# .next-build) — leaving the server with no .next. Always build fresh.
NEXT_DIST_DIR="$DIST_NAME" TURBO_FORCE=true npm run build

# ---------------------------------------------------------------------------
# 4a. Atomically swap the staged build into place
# ---------------------------------------------------------------------------
# Guard: never move the live build aside unless the new one actually exists,
# otherwise a failed/cache-skipped build would leave the server with no .next.
if [ ! -d "$REPO_ROOT/$BUILD_DIR" ]; then
  fail "Staged build dir $BUILD_DIR was not produced — aborting before touching live $LIVE_DIR."
fi
# Rename (not copy) so it's near-instant. The old process keeps its open file
# handles to the old inodes (now at .next-old) until PM2 reload swaps it out.
log "Swapping staged build into $LIVE_DIR..."
if [ -d "$REPO_ROOT/$LIVE_DIR" ]; then
  mv "$REPO_ROOT/$LIVE_DIR" "$REPO_ROOT/$OLD_DIR"
fi
mv "$REPO_ROOT/$BUILD_DIR" "$REPO_ROOT/$LIVE_DIR"

# ---------------------------------------------------------------------------
# 4b. Write deploy marker (watched at runtime for live update detection)
# ---------------------------------------------------------------------------
# Write in place (redirect, not mv) so the running server's fs.watch — which
# tracks the file's inode — fires reliably. Doing this right before the reload
# means a still-alive old process pushes the new version to connected clients.
log "Writing deploy marker..."
git rev-parse HEAD > "$REPO_ROOT/apps/web/.deployment-version"

# ---------------------------------------------------------------------------
# 5. Reload PM2 (re-reads ecosystem.config.cjs so updated paths take effect)
# ---------------------------------------------------------------------------
# startOrReload applies the config file (cwd, script paths) on every deploy.
# Plain `pm2 reload <name>` reuses the old config and would keep pointing at
# pre-restructure paths.
log "Reloading PM2 with updated config..."
pm2 startOrReload "$REPO_ROOT/ecosystem.config.cjs" --env production
pm2 save
pm2 list

# ---------------------------------------------------------------------------
# 6. Remove the previous build now that the new process has taken over
# ---------------------------------------------------------------------------
log "Removing previous build..."
rm -rf "$REPO_ROOT/$OLD_DIR"

log "Deploy complete."
