#!/bin/bash

set -e

SERVICE_NAME="coursebridge"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DOCKER="docker"
if [ "$(id -u)" -ne 0 ]; then
  DOCKER="sudo docker"
fi

if [ "${1:-}" = "remove" ]; then
  ENVIRONMENT="${2:-}"
  if [ -n "$ENVIRONMENT" ]; then
    ENV_FILE="$script_dir/.env-${SERVICE_NAME}-${ENVIRONMENT}"
    SECRET_SUFFIX="${SERVICE_NAME}-${ENVIRONMENT}"
  else
    ENV_FILE="$script_dir/.env-${SERVICE_NAME}"
    SECRET_SUFFIX="${SERVICE_NAME}"
  fi

  echo "Removing secrets for $SECRET_SUFFIX..."
  if [ -f "$ENV_FILE" ]; then
    while IFS='=' read -r key value; do
      if [ -z "$key" ] || echo "$key" | grep -q '^#' || [ "$key" = "$value" ]; then
        continue
      fi
      secret_name="$(echo "$key" | tr '[:upper:]' '[:lower:]')_${SECRET_SUFFIX}"
      $DOCKER secret rm "$secret_name" >/dev/null 2>&1 || true
    done < "$ENV_FILE"
  fi
  echo "Secrets removed."
  exit 0
fi

ENVIRONMENT="${1:-}"
if [ -n "$ENVIRONMENT" ]; then
  ENV_FILE="$script_dir/.env-${SERVICE_NAME}-${ENVIRONMENT}"
  SECRET_SUFFIX="${SERVICE_NAME}-${ENVIRONMENT}"
else
  ENV_FILE="$script_dir/.env-${SERVICE_NAME}"
  SECRET_SUFFIX="${SERVICE_NAME}"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

echo "Creating Docker secrets from $ENV_FILE with suffix: $SECRET_SUFFIX"

while IFS='=' read -r key value; do
  if [ -z "$key" ] || echo "$key" | grep -q '^#' || [ "$key" = "$value" ]; then
    continue
  fi

  value=$(echo "$value" | sed 's/^"//' | sed 's/"$//' | sed "s/^'//" | sed "s/'$//" | tr -d '\r')
  if [ -z "$value" ]; then
    continue
  fi
  secret_name="$(echo "$key" | tr '[:upper:]' '[:lower:]')_${SECRET_SUFFIX}"

  if $DOCKER secret ls --format "{{.Name}}" | grep -q "^${secret_name}$"; then
    $DOCKER secret rm "$secret_name" >/dev/null 2>&1 || true
  fi

  echo "Creating secret: $secret_name"
  echo -n "$value" | $DOCKER secret create "$secret_name" - >/dev/null
done < "$ENV_FILE"

echo "Secrets processing completed."
