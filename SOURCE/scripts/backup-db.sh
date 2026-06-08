#!/usr/bin/env bash
# =============================================================================
# backup-db.sh
#
# Logical Postgres backup (pg_dump custom format) for Supabase / local dev.
# Writes under repo-root backups/ (gitignored).
#
# Connection URL resolution matches scripts/apply-migration.mjs (first wins
# per variable from env files, then DEV_DATABASE_URL || DATABASE_URL).
#
# Supabase pooler:
#   • Session mode (pooler host, port 5432) or direct db.*.supabase.co:5432
#     are what we recommend for pg_dump.
#   • Transaction pool (often port 6543) breaks pg_dump; this script warns.
#
# Password in URI userinfo must be percent-encoded if it contains reserved
# characters (e.g. $ → %24, / → %2F, ) → %29). Otherwise libpq mis-parses and
# you may see errors like invalid integer for connection option "port".
#
# Usage:
#   ./scripts/backup-db.sh              # dev / default DB from env files
#   ./scripts/backup-db.sh --prod       # PROD_DATABASE_URL / .env.mirror / .env.prod
#
# Override explicitly:
#   DATABASE_URL='postgresql://...' ./scripts/backup-db.sh
#   PROD_DATABASE_URL='postgresql://...' ./scripts/backup-db.sh --prod
#
# If local pg_dump is older than the server (Supabase PG 17), either install
# client 17+ or use Docker (recommended): the script retries with Postgres 17
# in Docker on "server version mismatch". Force Docker with:
#   BACKUP_USE_DOCKER=1 ./scripts/backup-db.sh
#
# Restore:
#   ./scripts/restore-db-backup.sh backups/<file>.dump
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$ROOT_DIR/backups"
MIRROR_ENV="$ROOT_DIR/.env.mirror"
PROD_ENV="$ROOT_DIR/apps/web/.env.prod"

PROD_MODE=0
if [ "${1:-}" = "--prod" ]; then
  PROD_MODE=1
  shift || true
fi

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  sed -n '1,35p' "$0"
  exit 0
fi

if [ "${1:-}" != "" ]; then
  echo -e "${RED}Unexpected argument:${NC} $1" >&2
  echo "Usage: $0 [--prod]" >&2
  exit 1
fi

get_env_val_line() {
  local file="$1"
  local key="$2"
  # grep exits 1 when no match; with pipefail that must not abort the caller.
  grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d '=' -f2- | sed 's/^["'\'']//;s/["'\'']$//' || true
}

# Merge env vars from files the same way as apply-migration.mjs loadEnvFiles:
# only set from file if shell did not already define the variable.
merge_from_files() {
  local f key val equals trimmed
  for f in "$@"; do
    [ -f "$f" ] || continue
    while IFS= read -r line || [ -n "${line:-}" ]; do
      trimmed="${line#"${line%%[![:space:]]*}"}"
      trimmed="${trimmed%"${trimmed##*[![:space:]]}"}"
      [ -n "$trimmed" ] || continue
      [[ "$trimmed" == \#* ]] && continue
      equals="${trimmed%%=*}"
      [ "$equals" = "$trimmed" ] && continue
      key="${equals// /}"
      val="${trimmed#*=}"
      val="${val#"${val%%[![:space:]]*}"}"
      val="${val%"${val##*[![:space:]]}"}"
      val="${val#\"}"
      val="${val%\"}"
      val="${val#\'}"
      val="${val%\'}"
      case "$key" in
        DEV_DATABASE_URL)
          if [ -z "${DEV_DATABASE_URL:-}" ]; then
            DEV_DATABASE_URL="$val"
            export DEV_DATABASE_URL
          fi
          ;;
        DATABASE_URL)
          if [ -z "${DATABASE_URL:-}" ]; then
            DATABASE_URL="$val"
            export DATABASE_URL
          fi
          ;;
        PROD_DATABASE_URL)
          if [ -z "${PROD_DATABASE_URL:-}" ]; then
            PROD_DATABASE_URL="$val"
            export PROD_DATABASE_URL
          fi
          ;;
      esac
    done <"$f"
  done
}

mask_url() {
  local url="$1"
  echo "$url" | sed -E 's#(postgresql?://)[^@]+@#\1****@#'
}

warn_pooler() {
  local url="$1"
  if echo "$url" | grep -qE '(:6543)(/|$|\?)'; then
    echo -e "${YELLOW}Warning:${NC} URL uses port 6543 (transaction pool). pg_dump usually fails here." >&2
    echo -e "  Use Session mode (pooler ${CYAN}:5432${NC}) or direct ${CYAN}db.<project-ref>.supabase.co:5432${NC}." >&2
    echo "" >&2
  fi
}

ENV_CHAIN=(
  "$ROOT_DIR/.env.local"
  "$ROOT_DIR/.env.development"
  "$ROOT_DIR/.env"
  "$ROOT_DIR/apps/web/.env.local"
  "$ROOT_DIR/apps/web/.env"
  "$MIRROR_ENV"
)

merge_from_files "${ENV_CHAIN[@]}"

if [ "$PROD_MODE" -eq 1 ]; then
  URL="${PROD_DATABASE_URL:-}"
  if [ -z "${URL:-}" ] && [ -f "$MIRROR_ENV" ]; then
    URL="$(get_env_val_line "$MIRROR_ENV" "PROD_DATABASE_URL")"
  fi
  if [ -z "${URL:-}" ] && [ -f "$PROD_ENV" ]; then
    URL="$(get_env_val_line "$PROD_ENV" "DATABASE_URL")"
  fi
  if [ -z "${URL:-}" ]; then
    echo -e "${RED}No production database URL.${NC}" >&2
    echo "  Set ${CYAN}PROD_DATABASE_URL${NC}, or add it to ${CYAN}.env.mirror${NC}, or ${CYAN}DATABASE_URL${NC} in ${CYAN}apps/web/.env.prod${NC}." >&2
    exit 1
  fi
  NS="$(date +%N 2>/dev/null | cut -c1-9)"
  case "$NS" in '' | *[!0-9]*) NS="0" ;; esac
  TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)-$$-${NS}"
  OUT="$BACKUP_DIR/prod-full-${TIMESTAMP}.dump"
  LABEL="production"
else
  URL="${DEV_DATABASE_URL:-${DATABASE_URL:-}}"
  if [ -z "${URL:-}" ]; then
    echo -e "${RED}No database URL.${NC}" >&2
    echo "  Set ${CYAN}DEV_DATABASE_URL${NC} or ${CYAN}DATABASE_URL${NC} (env or ${CYAN}.env.local${NC} / ${CYAN}apps/web/.env.local${NC} / ${CYAN}.env.mirror${NC})." >&2
    exit 1
  fi
  NS="$(date +%N 2>/dev/null | cut -c1-9)"
  case "$NS" in '' | *[!0-9]*) NS="0" ;; esac
  TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)-$$-${NS}"
  OUT="$BACKUP_DIR/db-dev-${TIMESTAMP}.dump"
  LABEL="dev / default"
fi

warn_pooler "$URL"

mkdir -p "$BACKUP_DIR"

echo ""
echo -e "${CYAN}BrightBridge — DB backup (${LABEL})${NC}"
echo -e "  Target (masked): $(mask_url "$URL")"
echo -e "  Output file:     ${CYAN}$OUT${NC}"
echo ""

# Write to a partial path first; rename only after pg_dump succeeds so failed
# runs never leave a misleading timestamped .dump next to older good backups.
DUMP_PARTIAL="${OUT}.partial-$$"
rm -f "$DUMP_PARTIAL"

run_dump() {
  dump_with_docker() {
    docker run --rm -i \
      -e PGSSLMODE="${PGSSLMODE:-require}" \
      postgres:17-alpine \
      pg_dump \
      "$URL" \
      --format=custom \
      --no-owner \
      --no-acl \
      >"$DUMP_PARTIAL"
  }

  if [ "${BACKUP_USE_DOCKER:-}" = "1" ] || [ "${BACKUP_USE_DOCKER:-}" = "true" ]; then
    if command -v docker >/dev/null 2>&1; then
      dump_with_docker
      return
    fi
    echo -e "${RED}BACKUP_USE_DOCKER is set but Docker is not available.${NC}" >&2
    exit 1
  fi

  local err
  err="$(mktemp)"

  if command -v pg_dump >/dev/null 2>&1; then
    if PGSSLMODE="${PGSSLMODE:-require}" pg_dump \
      "$URL" \
      --format=custom \
      --no-owner \
      --no-acl \
      --file="$DUMP_PARTIAL" 2>"$err"; then
      rm -f "$err"
      return
    fi

    if grep -qs 'server version mismatch' "$err" && command -v docker >/dev/null 2>&1; then
      echo -e "${YELLOW}Local pg_dump is older than the server — retrying with Docker (postgres:17)...${NC}" >&2
      rm -f "$DUMP_PARTIAL" "$err"
      dump_with_docker
      return
    fi

    cat "$err" >&2
    rm -f "$err"
    exit 1
  fi

  if command -v docker >/dev/null 2>&1; then
    rm -f "$err"
    dump_with_docker
    return
  fi

  rm -f "$err"
  echo -e "${RED}Install PostgreSQL client tools (pg_dump) or Docker.${NC}" >&2
  exit 1
}

run_dump || { rm -f "$DUMP_PARTIAL"; exit 1; }
mv -f "$DUMP_PARTIAL" "$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
echo -e "${GREEN}✓ Backup written${NC}  ($SIZE)"
echo ""
echo "Verify listing (first 20 sections):"
if command -v docker >/dev/null 2>&1; then
  (
    set +o pipefail
    docker run --rm -i -v "$OUT:/dump:ro" postgres:17-alpine pg_restore --list /dump | head -20
  )
elif command -v pg_restore >/dev/null 2>&1; then
  (
    set +o pipefail
    pg_restore --list "$OUT" | head -20
  )
else
  echo -e "${YELLOW}(Install Docker or PostgreSQL clients to preview dump contents.)${NC}"
fi
echo ""
echo -e "${CYAN}The backups/ folder is gitignored — do not commit dumps.${NC}"
REL_OUT="${OUT#"$ROOT_DIR"/}"
echo "Restore (to another URL) with:"
echo -e "  ${CYAN}RESTORE_DATABASE_URL=postgresql://... ./scripts/restore-db-backup.sh $REL_OUT${NC}"
echo ""
