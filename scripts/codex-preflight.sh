#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

PASS=0
WARN=0
FAIL=0

ok() {
  PASS=$((PASS + 1))
  printf '[PASS] %s\n' "$1"
}

warn() {
  WARN=$((WARN + 1))
  printf '[WARN] %s\n' "$1"
}

fail() {
  FAIL=$((FAIL + 1))
  printf '[FAIL] %s\n' "$1"
}

check_command() {
  local name="$1"
  local severity="${2:-warn}"

  if command -v "$name" >/dev/null 2>&1; then
    ok "command available: $name"
  else
    if [ "$severity" = "fail" ]; then
      fail "missing required command: $name"
    else
      warn "missing optional command: $name"
    fi
  fi
}

printf 'Codex preflight for BrightBridge\n'
printf 'Project root: %s\n\n' "$ROOT_DIR"

if [ -f ".codex/hooks.json" ]; then
  ok "found .codex/hooks.json"
else
  fail "missing .codex/hooks.json"
fi

if [ -x ".codex/prehook.sh" ]; then
  ok "found executable .codex/prehook.sh"
else
  fail "missing executable .codex/prehook.sh"
fi

if command -v node >/dev/null 2>&1; then
  if node -e "const fs=require('fs');const p='.codex/hooks.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));const hook=j?.hooks?.PreToolUse?.[0]?.hooks?.[0]?.command;if(!hook) process.exit(2);process.exit(0);" >/dev/null 2>&1; then
    ok ".codex/hooks.json is valid JSON and contains PreToolUse command"
  else
    fail ".codex/hooks.json is invalid or missing PreToolUse command"
  fi
else
  fail "node is required to validate .codex/hooks.json"
fi

check_command "rg" "fail"
check_command "node" "fail"
check_command "npm" "fail"
check_command "graphify" "warn"
check_command "supabase" "warn"

if [ -f "graphify-out/GRAPH_REPORT.md" ]; then
  ok "found graphify-out/GRAPH_REPORT.md"
else
  warn "missing graphify-out/GRAPH_REPORT.md"
fi

if [ -f "graphify-out/wiki/index.md" ]; then
  ok "found graphify-out/wiki/index.md"
else
  warn "missing graphify-out/wiki/index.md"
fi

if [ -f ".env.local" ] || [ -f "apps/web/.env.local" ]; then
  ok "found Supabase env file (.env.local or apps/web/.env.local)"
else
  warn "missing Supabase env file (.env.local or apps/web/.env.local)"
fi

if [ -d "node_modules" ]; then
  ok "found node_modules"
else
  warn "missing node_modules (run npm install)"
fi

printf '\nSummary: %s pass, %s warn, %s fail\n' "$PASS" "$WARN" "$FAIL"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

exit 0
