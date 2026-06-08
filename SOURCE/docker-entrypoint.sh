#!/bin/sh
set -eu

# Load Docker secrets exposed as *_FILE into runtime env vars expected by Next.js.
for var_name in $(env | awk -F= '/_FILE=/{print $1}'); do
  file_var_value=$(printenv "$var_name" || true)
  [ -n "$file_var_value" ] || continue
  [ -f "$file_var_value" ] || continue

  target_var_name="${var_name%_FILE}"
  target_var_value=$(cat "$file_var_value")
  export "$target_var_name=$target_var_value"
done

# Run CourseBridge test migrations first so missing additive tables are
# created even on pre-existing schemas.
node scripts/run-coursebridge-test-migrations.mjs

# Then run the generic migration bootstrap before starting the application.
node scripts/db-migrate-all.mjs

exec "$@"
