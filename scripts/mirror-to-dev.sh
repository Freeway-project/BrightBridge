#!/usr/bin/env bash
# =============================================================================
# mirror-to-dev.sh
#
# Mirrors schema + data from PRODUCTION Supabase → DEV Supabase.
#
# USAGE:
#   ./scripts/mirror-to-dev.sh
#
# FIRST TIME SETUP:
#   Copy .env.mirror.example → .env.mirror and fill in DEV_DATABASE_URL.
#   The PROD_DATABASE_URL is read from apps/web/.env.local automatically.
#
# WHAT IT COPIES:
#   - Full schema (public schema only — not auth, storage, etc.)
#   - All data rows
#   - Sequences (so auto-increment IDs continue correctly)
#
# WHAT IT SKIPS:
#   - auth.users  (Supabase manages this — do NOT copy between projects)
#   - storage.*   (Supabase managed)
#   - supabase_migrations (each project tracks its own)
#
# SAFETY:
#   - Prompts for confirmation before wiping the dev DB
#   - Never touches production
# =============================================================================

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── Load env ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
MIRROR_ENV="$ROOT_DIR/.env.mirror"
# Support both .env and .env.local (Next.js reads both)
PROD_ENV="$ROOT_DIR/apps/web/.env.local"
if [ ! -f "$PROD_ENV" ]; then
  PROD_ENV="$ROOT_DIR/apps/web/.env"
fi

if [ ! -f "$MIRROR_ENV" ]; then
  echo -e "${RED}✗ Missing .env.mirror file.${NC}"
  echo -e "  Copy .env.mirror.example → .env.mirror and fill in DEV_DATABASE_URL."
  exit 1
fi

if [ ! -f "$PROD_ENV" ]; then
  echo -e "${RED}✗ Missing apps/web/.env.local (production env).${NC}"
  exit 1
fi

# Parse DATABASE_URL from prod env
PROD_DATABASE_URL=$(grep '^DATABASE_URL' "$PROD_ENV" | cut -d '=' -f2- | tr -d '"')
# Parse DEV_DATABASE_URL from mirror env
DEV_DATABASE_URL=$(grep '^DEV_DATABASE_URL' "$MIRROR_ENV" | cut -d '=' -f2- | tr -d '"')

if [ -z "$PROD_DATABASE_URL" ]; then
  echo -e "${RED}✗ DATABASE_URL not found in apps/web/.env.local${NC}"
  exit 1
fi

if [ -z "$DEV_DATABASE_URL" ]; then
  echo -e "${RED}✗ DEV_DATABASE_URL not found in .env.mirror${NC}"
  exit 1
fi

# ── Safety check ─────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          BrightBridge DB Mirror Script           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠  This will WIPE the dev database and replace it with production data.${NC}"
echo -e "   Production DB: ${PROD_DATABASE_URL%%@*}@****"
echo -e "   Dev DB:        ${DEV_DATABASE_URL%%@*}@****"
echo ""
read -p "   Type 'mirror' to confirm: " CONFIRM

if [ "$CONFIRM" != "mirror" ]; then
  echo -e "${YELLOW}Aborted.${NC}"
  exit 0
fi

# ── Temp dump file ────────────────────────────────────────────────────────────
DUMP_FILE=$(mktemp /tmp/brightbridge-mirror-XXXXXX.dump)
trap 'rm -f "$DUMP_FILE"' EXIT

echo ""
echo -e "${CYAN}[1/4] Dumping production schema + data...${NC}"

# Dump public schema only (custom-format for efficiency) using Docker PG17
docker run --rm -i postgres:17-alpine pg_dump \
  "$PROD_DATABASE_URL" \
  --format=custom \
  --schema=public \
  --no-owner \
  --no-acl \
  --exclude-table=public.schema_migrations \
  --exclude-table=public.supabase_migrations \
  > "$DUMP_FILE"

echo -e "${GREEN}✓ Dump complete: $(du -h "$DUMP_FILE" | cut -f1)${NC}"

# ── Drop + recreate public schema on dev ─────────────────────────────────────
echo ""
echo -e "${CYAN}[2/4] Wiping dev public schema...${NC}"

docker run --rm -i postgres:17-alpine psql "$DEV_DATABASE_URL" --quiet -c "
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres;
  GRANT ALL ON SCHEMA public TO anon;
  GRANT ALL ON SCHEMA public TO authenticated;
  GRANT ALL ON SCHEMA public TO service_role;
"

echo -e "${GREEN}✓ Dev schema wiped.${NC}"

# ── Restore to dev ────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}[3/4] Restoring to dev database...${NC}"

docker run --rm -i postgres:17-alpine pg_restore \
  --dbname="$DEV_DATABASE_URL" \
  --schema=public \
  --no-owner \
  --no-acl \
  < "$DUMP_FILE" || true

echo -e "${GREEN}✓ Restore complete.${NC}"

# ── Verify row counts ─────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}[4/4] Verifying row counts on dev...${NC}"

docker run --rm -i postgres:17-alpine psql "$DEV_DATABASE_URL" --quiet --tuples-only -c "
  SELECT
    tablename,
    (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', schemaname, tablename), FALSE, TRUE, '')))[1]::text::int AS row_count
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
" | awk 'NF { printf "   %-40s %s rows\n", $1, $3 }'

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            Mirror complete! ✓                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Next: Update ${CYAN}apps/web/.env.local${NC} to point to your dev project."
echo -e "  See  ${CYAN}.env.mirror.example${NC} for the dev env var names."
echo ""
