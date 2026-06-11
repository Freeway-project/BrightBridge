#!/usr/bin/env bash
# =============================================================================
# backup-prod-db.sh
#
# Full logical backup of your production Postgres database before applying
# migrations. Writes a single pg_dump custom-format file.
#
# WHAT YOU GET (so a bad migration can be rolled back from data + “links”):
#   • Every row in every table you have permission to dump (your app data).
#   • Table definitions, PRIMARY KEYs, FOREIGN KEYs, UNIQUE — relationships
#     between rows are stored in the dump and come back correctly on restore.
#   • Sequences (serial / identity) so new inserts won’t collide after restore.
#
# USE A DIRECT SESSION URL (port 5432), not a transaction-pooler port.
#
# USAGE:
#   export PROD_DATABASE_URL='postgresql://...'
#   ./scripts/backup-prod-db.sh
#
#   # Or rely on .env.mirror (PROD_DATABASE_URL) or apps/web/.env.prod (DATABASE_URL)
#   ./scripts/backup-prod-db.sh
#
# OUTPUT:
#   backups/prod-full-YYYYMMDDTHHMMSSZ.dump
#
# RESTORE (after a bad migration — test on dev/staging first):
#   ./scripts/restore-db-backup.sh backups/prod-full-....dump
#   # with RESTORE_DATABASE_URL=postgresql://... pointing at the DB to rebuild
#
# Manual one-liner:
#   pg_restore --clean --if-exists --no-owner --no-acl --verbose -d "$TARGET_URL" backups/prod-full-....dump
#
# LIMITS:
#   - Does not download object storage / blob files (they live outside Postgres).
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$ROOT_DIR/backups"
MIRROR_ENV="$ROOT_DIR/.env.mirror"
PROD_ENV="$ROOT_DIR/apps/web/.env.prod"

get_env_val() {
  local file="$1"
  local key="$2"
  grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d '=' -f2- | sed 's/^["'\'']//;s/["'\'']$//'
}

mask_url() {
  local url="$1"
  # userinfo@host — hide password
  echo "$url" | sed -E 's#(postgresql?://)[^@]+@#\1****@#'
}

if [ -n "${PROD_DATABASE_URL:-}" ]; then
  URL="$PROD_DATABASE_URL"
elif [ -f "$MIRROR_ENV" ]; then
  URL="$(get_env_val "$MIRROR_ENV" "PROD_DATABASE_URL")"
fi

if [ -z "${URL:-}" ] && [ -f "$PROD_ENV" ]; then
  URL="$(get_env_val "$PROD_ENV" "DATABASE_URL")"
fi

if [ -z "${URL:-}" ]; then
  echo -e "${RED}No production database URL.${NC}" >&2
  echo "  Set ${CYAN}PROD_DATABASE_URL${NC} in the environment, or add it to:" >&2
  echo "    • ${CYAN}.env.mirror${NC} (PROD_DATABASE_URL), or" >&2
  echo "    • ${CYAN}apps/web/.env.prod${NC} (DATABASE_URL)" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/prod-full-${TIMESTAMP}.dump"

echo ""
echo -e "${CYAN}BrightBridge — production DB backup (read-only)${NC}"
echo -e "  Target host (masked): $(mask_url "$URL")"
echo -e "  Output file:          ${CYAN}$OUT${NC}"
echo ""

run_dump() {
  if command -v pg_dump >/dev/null 2>&1; then
    PGSSLMODE="${PGSSLMODE:-require}" pg_dump \
      "$URL" \
      --format=custom \
      --no-owner \
      --no-acl \
      --file="$OUT"
    return
  fi

  if command -v docker >/dev/null 2>&1; then
    # Fallback: run pg_dump inside Docker — custom format on stdout
    docker run --rm -i \
      -e PGSSLMODE="${PGSSLMODE:-require}" \
      postgres:17-alpine \
      pg_dump \
      "$URL" \
      --format=custom \
      --no-owner \
      --no-acl \
      >"$OUT"
    return
  fi

  echo -e "${RED}Install PostgreSQL client tools (pg_dump) or Docker.${NC}" >&2
  exit 1
}

run_dump

SIZE="$(du -h "$OUT" | cut -f1)"
echo -e "${GREEN}✓ Backup written${NC}  ($SIZE)"
echo ""
echo "Verify listing (first 20 sections):"
if command -v pg_restore >/dev/null 2>&1; then
  pg_restore --list "$OUT" | head -20
else
  docker run --rm -i -v "$OUT:/dump:ro" postgres:17-alpine pg_restore --list /dump | head -20
fi
echo ""
echo -e "${CYAN}Keep this file off git and in a secure location (encrypted drive, vault).${NC}"
echo ""
echo "After a bad migration, restore data + links with:"
REL_OUT="${OUT#"$ROOT_DIR"/}"
echo -e "  ${CYAN}RESTORE_DATABASE_URL=postgresql://... ./scripts/restore-db-backup.sh $REL_OUT${NC}"
