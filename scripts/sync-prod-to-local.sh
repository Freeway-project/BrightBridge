#!/usr/bin/env bash
# =============================================================================
# sync-prod-to-local.sh
#
# Pull the latest prod backup and restore it to local Postgres in one shot.
# Runs three steps:
#   1. backup-db.sh --prod  (creates backups/prod-full-<timestamp>.dump)
#   2. restore-db-backup.sh (restores to LOCAL_DB_URL, non-interactive)
#   3. db-migrate-all.mjs   (applies any migrations added after the backup)
#
# Requirements:
#   • PROD_DATABASE_URL set in env, .env.mirror, or apps/web/.env.prod
#   • Local Postgres running (docker compose up -d)
#
# Usage:
#   ./scripts/sync-prod-to-local.sh
#
# Override local target:
#   LOCAL_DB_URL=postgresql://... ./scripts/sync-prod-to-local.sh
#
# After restore:
#   - Prod accounts have no password_hash — use the dev bypass login:
#       Set ENABLE_DEV_LOGIN=1 + NEXT_PUBLIC_ENABLE_DEV_LOGIN=1 in .env.local
#       and sign in via the dev panel on /auth/login with any prod email.
#   - Or run: node scripts/seed-local-postgres.mjs
#       to re-seed dev profiles on top (adds Dev1234! password for dev@... accounts).
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

LOCAL_DB_URL="${LOCAL_DB_URL:-postgresql://coursebridge_user:localdev@localhost:5433/coursebridge}"

log()  { echo -e "${CYAN}[sync-prod-to-local]${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
fail() { echo -e "${RED}ERROR:${NC} $*" >&2; exit 1; }

echo ""
echo -e "${CYAN}━━━━━━━━ Sync prod → local ━━━━━━━━${NC}"
echo ""

# ── Step 1: Take prod backup ──────────────────────────────────────────────────
log "Step 1/3 — taking prod backup…"
"$SCRIPT_DIR/backup-db.sh" --prod
echo ""

# Find the newest prod dump (backup-db.sh names them prod-full-<timestamp>.dump)
LATEST=$(ls -t "$ROOT_DIR/backups/prod-full-"*.dump 2>/dev/null | head -1 || true)
if [ -z "$LATEST" ]; then
  fail "No prod-full-*.dump found in backups/ — did backup-db.sh succeed?"
fi
ok "Latest backup: $(basename "$LATEST")"
echo ""

# ── Step 2: Restore to local (non-interactive — local target, safe to skip prompt) ──
log "Step 2/3 — restoring to local Postgres…"
log "  Target: $LOCAL_DB_URL"
echo ""

# Pass RESTORE_DATABASE_URL and PGSSLMODE=disable (local Postgres has no TLS).
# The restore script prompts for "RESTORE" + hostname; we pipe them in here so
# the user doesn't have to type them when they already ran this script knowingly.
EXPECTED_HOST=$(echo "$LOCAL_DB_URL" | sed -E 's#^postgres(ql)?://[^@]+@##; s#[:/?].*$##')

PGSSLMODE=disable \
RESTORE_DATABASE_URL="$LOCAL_DB_URL" \
  "$SCRIPT_DIR/restore-db-backup.sh" "$LATEST" <<EOF
RESTORE
$EXPECTED_HOST
EOF

echo ""

# ── Step 3: Apply any pending migrations ────────────────────────────────────
log "Step 3/3 — applying pending migrations…"
DATABASE_URL="$LOCAL_DB_URL" node "$SCRIPT_DIR/db-migrate-all.mjs"
echo ""

ok "Sync complete."
echo ""
echo -e "  ${YELLOW}Prod accounts have no password_hash.${NC}"
echo "  Sign in with the dev bypass panel (ENABLE_DEV_LOGIN=1)"
echo "  or run:  node scripts/seed-local-postgres.mjs"
echo "           to add dev accounts with password Dev1234!"
echo ""
