#!/usr/bin/env bash
# =============================================================================
# restore-db-backup.sh
#
# Restore a .dump file created by backup-prod-db.sh (pg_restore custom format).
# Use this after a bad migration: you get your rows back AND foreign keys,
# indexes, and sequences so IDs and “links” between tables stay consistent.
#
# WARNING: --clean drops objects before recreating them. The TARGET database
# will be overwritten for everything contained in the dump. Do not point at
# production until you mean it (usually verify on dev/staging first).
#
# USAGE:
#   ./scripts/restore-db-backup.sh backups/prod-full-....dump
#
# Target URL is read from (first non-empty wins):
#   • env RESTORE_DATABASE_URL
#   • env DEV_DATABASE_URL (.env.mirror style)
#   • env DATABASE_URL
#
#   RESTORE_DATABASE_URL='postgresql://...' ./scripts/restore-db-backup.sh path/to.dump
#
# You will be asked to type RESTORE and the target DB hostname to confirm.
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
MIRROR_ENV="$ROOT_DIR/.env.mirror"

get_env_val() {
  local file="$1"
  local key="$2"
  grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d '=' -f2- | sed 's/^["'\'']//;s/["'\'']$//'
}

mask_url() {
  local url="$1"
  echo "$url" | sed -E 's#(postgresql?://)[^@]+@#\1****@#'
}

extract_host() {
  local url="$1"
  echo "$url" | sed -E 's#^postgres(ql)?://[^@]+@##; s#[:/?].*$##'
}

if [ "${1:-}" = "" ] || [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  echo "Usage: RESTORE_DATABASE_URL=postgresql://... $0 <path-to-backup.dump>" >&2
  exit 1
fi

DUMP="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
if [ ! -f "$DUMP" ]; then
  echo -e "${RED}File not found: $1${NC}" >&2
  exit 1
fi

TARGET="${RESTORE_DATABASE_URL:-}"
if [ -z "$TARGET" ]; then
  TARGET="${DEV_DATABASE_URL:-}"
fi
if [ -z "$TARGET" ] && [ -f "$MIRROR_ENV" ]; then
  TARGET="$(get_env_val "$MIRROR_ENV" "DEV_DATABASE_URL")"
fi
if [ -z "$TARGET" ]; then
  TARGET="${DATABASE_URL:-}"
fi

if [ -z "$TARGET" ]; then
  echo -e "${RED}No target database URL.${NC}" >&2
  echo "  Set ${CYAN}RESTORE_DATABASE_URL${NC} (recommended), ${CYAN}DEV_DATABASE_URL${NC}, or ${CYAN}DATABASE_URL${NC}." >&2
  exit 1
fi

EXPECTED_HOST="$(extract_host "$TARGET")"

echo ""
echo -e "${YELLOW}━━━━━━━━ Restore — destructive on target ━━━━━━━━${NC}"
echo -e "  Dump file:    ${CYAN}$DUMP${NC}"
echo -e "  Target (masked): $(mask_url "$TARGET")"
echo ""
echo -e "${RED}This runs pg_restore with --clean --if-exists.${NC}"
echo "  All tables, data, FKs, and sequences in the dump replace matching"
echo "  objects in the target. Test on a throwaway DB first if unsure."
echo ""
read -r -p "Type ${CYAN}RESTORE${NC} to continue: " CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
  echo -e "${YELLOW}Aborted.${NC}"
  exit 0
fi

read -r -p "Type target hostname to confirm (e.g. ${EXPECTED_HOST}): " HOST_CONFIRM
if [ "$HOST_CONFIRM" != "$EXPECTED_HOST" ]; then
  echo -e "${RED}Hostname mismatch. Aborted.${NC}" >&2
  exit 1
fi

run_restore() {
  if command -v pg_restore >/dev/null 2>&1; then
    PGSSLMODE="${PGSSLMODE:-require}" pg_restore \
      --clean \
      --if-exists \
      --no-owner \
      --no-acl \
      --verbose \
      --dbname="$TARGET" \
      "$DUMP"
    return
  fi

  if command -v docker >/dev/null 2>&1; then
    docker run --rm -i \
      -e PGSSLMODE="${PGSSLMODE:-require}" \
      -v "$DUMP:/backup.dump:ro" \
      postgres:17-alpine \
      pg_restore \
      --clean \
      --if-exists \
      --no-owner \
      --no-acl \
      --verbose \
      --dbname="$TARGET" \
      /backup.dump
    return
  fi

  echo -e "${RED}Install PostgreSQL client (pg_restore) or Docker.${NC}" >&2
  exit 1
}

echo ""
echo -e "${CYAN}Restoring…${NC}"
run_restore

echo ""
echo -e "${GREEN}✓ pg_restore finished.${NC}"
echo -e "  Re-apply any ${CYAN}db/migrations${NC} grants your project expects if the dump predates them."
