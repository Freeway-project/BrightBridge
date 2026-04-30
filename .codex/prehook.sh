#!/usr/bin/env bash

# Codex PreToolUse hook for BrightBridge.
# This hook must never fail; it only injects helpful context.

set +e

context=""

append_context() {
  local message="$1"
  if [ -z "$context" ]; then
    context="$message"
  else
    context="$context; $message"
  fi
}

if [ -f "graphify-out/GRAPH_REPORT.md" ]; then
  append_context "graphify report found; review graphify-out/GRAPH_REPORT.md before architecture scans"
fi

if [ -f "graphify-out/wiki/index.md" ]; then
  append_context "graphify wiki found; prefer graphify-out/wiki/index.md over raw file greps"
fi

if [ ! -f "graphify-out/GRAPH_REPORT.md" ] && [ ! -f "graphify-out/wiki/index.md" ]; then
  append_context "graphify outputs missing; run graphify update . when graphify CLI is available"
fi

if [ ! -f ".env.local" ] && [ ! -f "apps/web/.env.local" ]; then
  append_context "supabase env file missing; db and auth scripts may fail until .env.local is set"
fi

if [ ! -d "node_modules" ]; then
  append_context "node_modules missing; run npm install before build or typecheck"
fi

if [ -z "$context" ]; then
  exit 0
fi

escaped_context=$(printf '%s' "$context" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' "$escaped_context"

exit 0
