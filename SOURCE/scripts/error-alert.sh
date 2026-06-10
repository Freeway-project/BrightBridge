#!/usr/bin/env bash
# Error Alert Monitor - Watches PM2 logs and alerts on errors
# Usage: ./scripts/error-alert.sh [app_name] [slack_webhook_url]

set -euo pipefail

APP_NAME="${1:-brightbridge}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
LOG_FILE="/var/log/pm2/${APP_NAME}-error.log"
ALERT_FILE="/tmp/pm2-last-alert-$(date +%s).txt"

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

alert() {
  local severity="$1"
  local message="$2"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  echo -e "${RED}[ALERT] $timestamp - $severity: $message${NC}"

  # Send to Slack if webhook is configured
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST "$SLACK_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{
        \"text\": \"🚨 $APP_NAME Error Alert\",
        \"blocks\": [
          {
            \"type\": \"section\",
            \"text\": {
              \"type\": \"mrkdwn\",
              \"text\": \"*Severity:* $severity\n*Message:* $message\n*Time:* $timestamp\"
            }
          }
        ]
      }" 2>/dev/null || echo "Slack notification failed"
  fi
}

check_errors() {
  if [ ! -f "$LOG_FILE" ]; then
    echo -e "${YELLOW}[INFO] No error log found yet${NC}"
    return 0
  fi

  # Check for critical errors
  local errors=$(tail -100 "$LOG_FILE" | grep -E "Error:|⨯|FATAL|Unhandled|exception" || true)

  if [ -n "$errors" ]; then
    alert "CRITICAL" "Found $(echo "$errors" | wc -l) error(s) in logs"
    echo "$errors"
  else
    echo -e "${GREEN}[OK] No errors detected${NC}"
  fi
}

check_process() {
  local describe_output=$(pm2 describe "$APP_NAME" 2>/dev/null || echo "")
  if [ -z "$describe_output" ]; then
    alert "CRITICAL" "PM2 process '$APP_NAME' not found"
    return 1
  fi

  if echo "$describe_output" | grep -q "online"; then
    echo -e "${GREEN}[OK] Process is online${NC}"
  else
    alert "CRITICAL" "PM2 process '$APP_NAME' is not online"
    return 1
  fi
}

check_health() {
  local health_url="http://127.0.0.1:3000/api/version"
  if ! curl --fail --silent --show-error --max-time 5 "$health_url" > /dev/null 2>&1; then
    alert "WARNING" "Health check failed for $health_url"
    return 1
  else
    echo -e "${GREEN}[OK] Health check passed${NC}"
  fi
}

main() {
  echo -e "${GREEN}=== PM2 Error Alert Monitor ===${NC}"
  echo "App: $APP_NAME"
  echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""

  check_process
  check_health
  check_errors

  echo -e "\n${GREEN}=== Check Complete ===${NC}"
}

main "$@"
