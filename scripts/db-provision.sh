#!/usr/bin/env bash
set -euo pipefail

# Wrapper around scripts/sql/provision-coursebridge.sql for repeatable app DB provisioning.
# Example:
#   PGHOST=shared-services_postgres-test \
#   PGPORT=5432 \
#   PGUSER=postgres \
#   PGPASSWORD='***' \
#   APP_DB_NAME=coursebridge \
#   APP_DB_USER=coursebridge_user \
#   APP_DB_PASSWORD='***' \
#   ./scripts/db-provision.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/sql/provision-coursebridge.sql"

: "${PGHOST:?PGHOST is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${APP_DB_NAME:=coursebridge}"
: "${APP_DB_USER:=coursebridge_user}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD is required}"

PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-postgres}"
PGSSLMODE="${PGSSLMODE:-prefer}"

psql "host=$PGHOST port=$PGPORT user=$PGUSER dbname=$PGDATABASE sslmode=$PGSSLMODE" \
  -v ON_ERROR_STOP=1 \
  -v app_db_name="$APP_DB_NAME" \
  -v app_db_user="$APP_DB_USER" \
  -v app_db_password="$APP_DB_PASSWORD" \
  -f "$SQL_FILE"

echo "Provisioning completed for database '$APP_DB_NAME' and role '$APP_DB_USER'."
