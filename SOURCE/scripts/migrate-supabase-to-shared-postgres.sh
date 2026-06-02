#!/usr/bin/env bash
set -euo pipefail

# Pull selected schemas from hosted Supabase Postgres and restore into shared-service Postgres.
#
# Required env vars:
#   SUPABASE_DATABASE_URL   Source Supabase Postgres URL (session/direct, usually sslmode=require)
#   TARGET_DATABASE_URL     Target shared-service Postgres URL
#
# Optional env vars:
#   MIGRATION_SCHEMAS       Comma-separated schemas to migrate (default: public)
#   DUMP_DIR                Dump directory (default: backups/migrations)
#   CLEAN_TARGET            true/false (default: false). If true, uses --clean --if-exists on restore.
#   DRY_RUN                 true/false (default: false)
#
# Usage:
#   SUPABASE_DATABASE_URL='postgresql://...' TARGET_DATABASE_URL='postgresql://...' \
#   ./scripts/migrate-supabase-to-shared-postgres.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP_DIR="${DUMP_DIR:-$ROOT_DIR/backups/migrations}"
MIGRATION_SCHEMAS="${MIGRATION_SCHEMAS:-public}"
CLEAN_TARGET="${CLEAN_TARGET:-false}"
DRY_RUN="${DRY_RUN:-false}"

: "${SUPABASE_DATABASE_URL:?SUPABASE_DATABASE_URL is required}"
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"

mkdir -p "$DUMP_DIR"

ts="$(date -u +%Y%m%dT%H%M%SZ)"
dump_file="$DUMP_DIR/supabase-to-shared-$ts.dump"

schema_args=()
IFS=',' read -r -a schemas <<< "$MIGRATION_SCHEMAS"
for schema in "${schemas[@]}"; do
  s="$(echo "$schema" | xargs)"
  [[ -n "$s" ]] && schema_args+=("--schema=$s")
done

if [[ ${#schema_args[@]} -eq 0 ]]; then
  echo "ERROR: no schemas resolved from MIGRATION_SCHEMAS=$MIGRATION_SCHEMAS" >&2
  exit 1
fi

restore_args=(
  --no-owner
  --no-acl
)

if [[ "${CLEAN_TARGET,,}" == "true" ]]; then
  restore_args+=(--clean --if-exists)
fi

echo "Source (Supabase): $SUPABASE_DATABASE_URL"
echo "Target (shared):   $TARGET_DATABASE_URL"
echo "Schemas:           ${MIGRATION_SCHEMAS}"
echo "Dump:              $dump_file"
echo "Clean target:      $CLEAN_TARGET"
echo "Dry run:           $DRY_RUN"

if [[ "${DRY_RUN,,}" == "true" ]]; then
  echo "[DRY-RUN] pg_dump --format=custom --no-owner --no-acl ${schema_args[*]} -f $dump_file \"$SUPABASE_DATABASE_URL\""
  echo "[DRY-RUN] pg_restore ${restore_args[*]} -d \"$TARGET_DATABASE_URL\" $dump_file"
  exit 0
fi

if command -v pg_dump >/dev/null 2>&1 && command -v pg_restore >/dev/null 2>&1; then
  PGSSLMODE="${PGSSLMODE:-require}" pg_dump \
    --format=custom \
    --no-owner \
    --no-acl \
    "${schema_args[@]}" \
    -f "$dump_file" \
    "$SUPABASE_DATABASE_URL"

  PGSSLMODE="${TARGET_PGSSLMODE:-prefer}" pg_restore \
    "${restore_args[@]}" \
    -d "$TARGET_DATABASE_URL" \
    "$dump_file"
else
  echo "Local pg_dump/pg_restore not found. Falling back to Docker postgres:17-alpine."

  docker run --rm -i \
    -e PGPASSWORD= \
    -v "$DUMP_DIR:/work" \
    postgres:17-alpine \
    sh -lc "pg_dump --format=custom --no-owner --no-acl ${schema_args[*]} -f /work/$(basename "$dump_file") '$SUPABASE_DATABASE_URL'"

  docker run --rm -i \
    -e PGPASSWORD= \
    -v "$DUMP_DIR:/work" \
    postgres:17-alpine \
    sh -lc "pg_restore ${restore_args[*]} -d '$TARGET_DATABASE_URL' /work/$(basename "$dump_file")"
fi

echo "Migration completed: $dump_file"
echo "Next: run scripts/validate-shared-postgres-migration.sh to compare key table counts."
