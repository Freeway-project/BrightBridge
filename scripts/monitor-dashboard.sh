#!/bin/bash
# Live monitoring dashboard for BrightBridge app
# Usage: ./scripts/monitor-dashboard.sh

clear_screen() {
  clear
}

show_dashboard() {
  clear_screen

  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║         🔍 BrightBridge App Monitor Dashboard              ║"
  echo "║                $(date '+%Y-%m-%d %H:%M:%S')                    ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""

  # PM2 Status
  echo "📊 APP STATUS:"
  pm2 status brightbridge | grep -E "brightbridge|online|stopped" | head -1
  echo ""

  # Process Health
  echo "💾 PROCESS HEALTH:"
  pm2 status brightbridge | grep brightbridge | awk '{
    printf "  ├─ Uptime: %s\n", $7
    printf "  ├─ Status: %s\n", $9
    printf "  ├─ CPU: %s\n", $11
    printf "  └─ Memory: %s\n", $13
  }'
  echo ""

  # System Resources
  echo "🖥️  SYSTEM RESOURCES:"
  DISK=$(df / | awk 'NR==2 {print $5}')
  MEM=$(free | awk 'NR==2 {printf "%.0f%%", $3/$2*100}')
  echo "  ├─ Disk Usage: $DISK"
  echo "  ├─ RAM Usage: $MEM"
  echo "  └─ Free Disk: $(df / | awk 'NR==2 {print $4}')"
  echo ""

  # Recent Errors
  echo "⚠️  RECENT ERRORS (Last 5):"
  ERROR_COUNT=$(pm2 logs brightbridge --lines 50 --nostream 2>&1 | grep -i "error\|⨯\|warning" | wc -l)
  if [ $ERROR_COUNT -gt 0 ]; then
    echo "  ❌ Found $ERROR_COUNT errors in recent logs"
    pm2 logs brightbridge --lines 50 --nostream 2>&1 | grep -i "error\|⨯" | tail -5 | sed 's/^/  • /'
  else
    echo "  ✅ No recent errors detected"
  fi
  echo ""

  # API Health
  echo "🌐 API HEALTH CHECK:"
  API_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/api_response.txt http://localhost:3000/api/version 2>&1)
  if [[ "$API_RESPONSE" == *"307"* ]]; then
    echo "  ✅ API responding (redirecting to auth - normal)"
  elif [[ "$API_RESPONSE" == *"200"* ]]; then
    echo "  ✅ API responding OK"
  else
    echo "  ❌ API not responding properly (Code: $API_RESPONSE)"
  fi
  echo ""

  # Alerts
  echo "🚨 ALERTS:"
  if [[ "$DISK" == "8"* ]] || [[ "$DISK" == "9"* ]]; then
    echo "  🔴 CRITICAL: Disk usage is ${DISK} - cleanup needed!"
  elif [[ "$DISK" == "7"* ]]; then
    echo "  🟡 WARNING: Disk usage is ${DISK} - monitor closely"
  else
    echo "  🟢 OK: Disk usage is ${DISK}"
  fi

  APP_STATUS=$(pm2 status brightbridge 2>&1 | grep "online\|stopped")
  if [[ "$APP_STATUS" == *"stopped"* ]]; then
    echo "  🔴 CRITICAL: App is stopped!"
  else
    echo "  🟢 OK: App is online"
  fi
  echo ""

  echo "════════════════════════════════════════════════════════════"
  echo "Refreshing every 5 seconds... (Press Ctrl+C to stop)"
  echo "════════════════════════════════════════════════════════════"
}

# Main loop
while true; do
  show_dashboard
  sleep 5
done
