#!/usr/bin/env bash
# =============================================================================
# mirror-to-dev.sh
#
# Mirrors schema + data from PRODUCTION Supabase → DEV Supabase.
#
# USAGE:
#   ./scripts/mirror-to-dev.sh
#
# CONFIG (.env.mirror — copy from .env.mirror.example):
#   DEV_DATABASE_URL=postgresql://...   (required, target)
#   PROD_DATABASE_URL=postgresql://...  (recommended — prod DB; avoids using
#                                         apps/web/.env when that file is dev)
#   MIRROR_INCLUDE_AUTH=1               (default 1) copy auth.users +
#                                         auth.identities so logins + public.profiles
#                                         FK stay valid
#   MIRROR_EXTRA_SCHEMAS=monitoring     (default monitoring) comma-separated app
#                                         schemas to include besides public; use "none"
#                                         to copy public only
#
# COPIES:
#   - public (+ extra app schemas such as monitoring): full schema + data
#   - optional: auth.users + auth.identities (data only) for real prod accounts
#
# DOES NOT COPY (still):
#   - Supabase Storage bucket objects (metadata in storage.* may exist; binaries
#     live in object storage — sync separately if you use hosted Storage)
#   - Realtime replication state
#   - Encrypted secrets / different JWT signing keys still allow password login
#     using hashed passwords in auth.users
#
# AFTER RESTORE (automatic):
#   - service_role grants on public (fixes 42501 after pg_restore --no-acl)
#   - auth instance_id + token column repair on dev (GoTrue-safe)
#
# SAFETY:
#   - Prompts before wiping dev data
#   - Never writes to production
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
PROD_ENV="$ROOT_DIR/apps/web/.env.local"
if [ ! -f "$PROD_ENV" ]; then
  PROD_ENV="$ROOT_DIR/apps/web/.env"
fi
GRANTS_SQL="$ROOT_DIR/supabase/migrations/20260505120000_service_role_public_grants.sql"
POST_AUTH_SQL="$ROOT_DIR/scripts/sql/mirror-post-auth-repair.sql"

if [ ! -f "$MIRROR_ENV" ]; then
  echo -e "${RED}✗ Missing .env.mirror file.${NC}"
  echo -e "  Copy .env.mirror.example → .env.mirror and fill in DEV_DATABASE_URL."
  exit 1
fi

get_env_val() {
  local file="$1"
  local key="$2"
  grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d '=' -f2- | sed 's/^["'\'']//;s/["'\'']$//'
}

DEV_DATABASE_URL="$(get_env_val "$MIRROR_ENV" "DEV_DATABASE_URL")"
PROD_DATABASE_URL="$(get_env_val "$MIRROR_ENV" "PROD_DATABASE_URL")"

if [ -z "$PROD_DATABASE_URL" ] && [ -f "$PROD_ENV" ]; then
  PROD_DATABASE_URL="$(get_env_val "$PROD_ENV" "DATABASE_URL")"
fi

MIRROR_INCLUDE_AUTH="$(get_env_val "$MIRROR_ENV" "MIRROR_INCLUDE_AUTH")"
if [ -z "$MIRROR_INCLUDE_AUTH" ]; then
  MIRROR_INCLUDE_AUTH="1"
fi
MIRROR_EXTRA_SCHEMAS="$(get_env_val "$MIRROR_ENV" "MIRROR_EXTRA_SCHEMAS")"
if [ -z "$MIRROR_EXTRA_SCHEMAS" ]; then
  MIRROR_EXTRA_SCHEMAS="monitoring"
fi

if [ -z "$PROD_DATABASE_URL" ]; then
  echo -e "${RED}✗ No production database URL.${NC}"
  echo -e "  Set ${CYAN}PROD_DATABASE_URL${NC} in .env.mirror, or add ${CYAN}DATABASE_URL${NC}"
  echo -e "  for production in apps/web/.env.local (not dev)."
  exit 1
fi

if [ -z "$DEV_DATABASE_URL" ]; then
  echo -e "${RED}✗ DEV_DATABASE_URL not found in .env.mirror${NC}"
  exit 1
fi

auth_on() {
  case "$(echo "$MIRROR_INCLUDE_AUTH" | tr '[:upper:]' '[:lower:]')" in
    0 | false | no | off) return 1 ;;
    *) return 0 ;;
  esac
}

schema_exists() {
  local url="$1"
  local sch="$2"
  local out
  out="$(docker run --rm -i postgres:17-alpine psql "$url" -tAc \
    "select 1 from information_schema.schemata where schema_name = '$sch'" 2>/dev/null || true)"
  [ "$(echo "$out" | tr -d '[:space:]')" = "1" ]
}

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          BrightBridge DB Mirror Script           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Source (prod): ${PROD_DATABASE_URL%%@*}@****"
echo -e "  Target (dev):  ${DEV_DATABASE_URL%%@*}@****"
if auth_on; then
  echo -e "  ${GREEN}Auth:${NC}           copy auth.users + auth.identities (prod passwords work on dev)"
else
  echo -e "  ${YELLOW}Auth:${NC}           skip — ensure auth.users on dev has rows for every profiles.id"
fi
echo -e "  Extra schemas:  ${MIRROR_EXTRA_SCHEMAS}"
echo ""
echo -e "${YELLOW}⚠  This will WIPE listed schemas on DEV and replace them from prod.${NC}"
read -p "   Type 'mirror' to confirm: " CONFIRM

if [ "$CONFIRM" != "mirror" ]; then
  echo -e "${YELLOW}Aborted.${NC}"
  exit 0
fi

DUMP_FILE=$(mktemp /tmp/brightbridge-mirror-XXXXXX.dump)
AUTH_DUMP=$(mktemp /tmp/brightbridge-mirror-auth-XXXXXX.dump)
trap 'rm -f "$DUMP_FILE" "$AUTH_DUMP"' EXIT

# ── Resolve schema list for pg_dump (public + optional extras) ──────────────
DUMP_ARGS=(--format=custom --no-owner --no-acl)
DUMP_ARGS+=(--schema=public)

if [ "$MIRROR_EXTRA_SCHEMAS" != "none" ]; then
  IFS=',' read -ra EXTRA_PARTS <<< "$MIRROR_EXTRA_SCHEMAS"
  for raw in "${EXTRA_PARTS[@]}"; do
    sch=$(echo "$raw" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$sch" ] && continue
    if schema_exists "$PROD_DATABASE_URL" "$sch"; then
      DUMP_ARGS+=(--schema="$sch")
      echo -e "${GREEN}✓${NC} will include schema ${CYAN}$sch${NC} (present on prod)"
    else
      echo -e "${YELLOW}⚠${NC} schema ${CYAN}$sch${NC} not on prod — skipping"
    fi
  done
fi

echo ""
echo -e "${CYAN}[1/6] Dumping production (app schemas)...${NC}"
docker run --rm -i postgres:17-alpine pg_dump \
  "$PROD_DATABASE_URL" \
  "${DUMP_ARGS[@]}" \
  --exclude-table=public.schema_migrations \
  --exclude-table=public.supabase_migrations \
  >"$DUMP_FILE"

echo -e "${GREEN}✓ App dump: $(du -h "$DUMP_FILE" | cut -f1)${NC}"

if auth_on; then
  echo ""
  echo -e "${CYAN}[2/6] Dumping production auth (users + identities, data only)...${NC}"
  docker run --rm -i postgres:17-alpine pg_dump \
    "$PROD_DATABASE_URL" \
    --format=custom \
    --no-owner \
    --no-acl \
    --data-only \
    --table=auth.users \
    --table=auth.identities \
    >"$AUTH_DUMP"
  echo -e "${GREEN}✓ Auth dump: $(du -h "$AUTH_DUMP" | cut -f1)${NC}"
else
  echo ""
  echo -e "${YELLOW}[2/6] Skipping auth dump (MIRROR_INCLUDE_AUTH off).${NC}"
fi

# ── Wipe dev app schemas ─────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}[3/6] Wiping dev app schemas...${NC}"

# Drop extra schemas that we restore (except public handled below)
if [ "$MIRROR_EXTRA_SCHEMAS" != "none" ]; then
  IFS=',' read -ra EXTRA_PARTS <<< "$MIRROR_EXTRA_SCHEMAS"
  for raw in "${EXTRA_PARTS[@]}"; do
    sch=$(echo "$raw" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$sch" ] && continue
    if schema_exists "$DEV_DATABASE_URL" "$sch"; then
      docker run --rm -i postgres:17-alpine psql "$DEV_DATABASE_URL" --quiet -c \
        "DROP SCHEMA IF EXISTS \"$sch\" CASCADE;"
      echo -e "   dropped dev schema ${CYAN}$sch${NC}"
    fi
  done
fi

docker run --rm -i postgres:17-alpine psql "$DEV_DATABASE_URL" --quiet -c "
  DROP SCHEMA IF EXISTS public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres;
  GRANT ALL ON SCHEMA public TO anon;
  GRANT ALL ON SCHEMA public TO authenticated;
  GRANT ALL ON SCHEMA public TO service_role;
"

echo -e "${GREEN}✓ Dev public schema recreated.${NC}"

# ── Auth: truncate + restore + repair (before public — satisfies FK) ────────
if auth_on; then
  echo ""
  echo -e "${CYAN}[4/6] Replacing dev auth users + identities...${NC}"
  # Hosted Storage metadata can FK to auth.users — clear it on dev before truncating auth.
  docker run --rm -i postgres:17-alpine psql "$DEV_DATABASE_URL" --quiet -v ON_ERROR_STOP=0 -c "
    DO \$body\$
    BEGIN
      IF to_regclass('storage.objects') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE storage.objects CASCADE';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END
    \$body\$;
  " 2>/dev/null || true
  docker run --rm -i postgres:17-alpine psql "$DEV_DATABASE_URL" --quiet -v ON_ERROR_STOP=1 -c \
    "TRUNCATE TABLE auth.users CASCADE;"
  docker run --rm -i postgres:17-alpine pg_restore \
    --dbname="$DEV_DATABASE_URL" \
    --data-only \
    --no-owner \
    --no-acl \
    --exit-on-error \
    <"$AUTH_DUMP"
  docker run --rm -i postgres:17-alpine psql "$DEV_DATABASE_URL" --quiet -v ON_ERROR_STOP=1 -f "$POST_AUTH_SQL"
  echo -e "${GREEN}✓ Auth restored and repaired (instance_id + token columns).${NC}"
else
  echo ""
  echo -e "${YELLOW}[4/6] Skipping auth replace.${NC}"
fi

# ── Restore app data ───────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}[5/6] Restoring app dump to dev...${NC}"
set +e
docker run --rm -i postgres:17-alpine pg_restore \
  --dbname="$DEV_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --exit-on-error \
  <"$DUMP_FILE"
RESTORE_STAT=$?
set -e
if [ "$RESTORE_STAT" -ne 0 ]; then
  echo -e "${RED}✗ pg_restore exited $RESTORE_STAT${NC}"
  exit "$RESTORE_STAT"
fi
echo -e "${GREEN}✓ App restore complete.${NC}"

echo ""
echo -e "${CYAN}[6/6] Grants + verification...${NC}"
if [ -f "$GRANTS_SQL" ]; then
  docker run --rm -i postgres:17-alpine psql "$DEV_DATABASE_URL" --quiet -v ON_ERROR_STOP=1 -f "$GRANTS_SQL"
  echo -e "${GREEN}✓ service_role grants applied.${NC}"
else
  echo -e "${YELLOW}⚠ Missing $GRANTS_SQL — apply service_role migration manually.${NC}"
fi

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
echo -e "  Use ${CYAN}apps/web/.env${NC} with this dev project (URL + anon + service_role)."
echo -e "  Optional: ${CYAN}npm run dev:users${NC} for extra @coursebridge.dev test accounts."
echo ""
