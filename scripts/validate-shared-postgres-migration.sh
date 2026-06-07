#!/usr/bin/env bash
set -euo pipefail

# Compare key table row counts between Supabase source and shared-service target.
#
# Required env vars:
#   SUPABASE_DATABASE_URL
#   TARGET_DATABASE_URL
#
# Optional:
#   COUNT_TABLES  Comma-separated table list. Defaults to core + newer CourseBridge tables.

: "${SUPABASE_DATABASE_URL:?SUPABASE_DATABASE_URL is required}"
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"

# Core tables plus the newer ones this repo added beyond the Azure baseline
# (issues/comments/mentions, support, reassignment, audit_log, escalations).
COUNT_TABLES="${COUNT_TABLES:-profiles,courses,course_assignments,course_status_events,review_sections,review_responses,course_comments,review_invites,organizational_units,org_unit_members,course_issues,course_issue_comments,issue_comment_mentions,support_messages,course_reassignments,course_escalations,escalation_messages,audit_log,schema_migrations}"

IFS=',' read -r -a tables <<< "$COUNT_TABLES"

echo "Comparing row counts"
printf '%-30s %-12s %-12s %-8s\n' "table" "source" "target" "match"
printf '%-30s %-12s %-12s %-8s\n' "-----" "------" "------" "-----"

mismatch=0
for t in "${tables[@]}"; do
  table="$(echo "$t" | xargs)"
  [[ -n "$table" ]] || continue

  src_count="$(psql "$SUPABASE_DATABASE_URL" -Atc "select count(*) from public.\"$table\";" 2>/dev/null || echo ERR)"
  tgt_count="$(psql "$TARGET_DATABASE_URL" -Atc "select count(*) from public.\"$table\";" 2>/dev/null || echo ERR)"

  status="yes"
  if [[ "$src_count" != "$tgt_count" ]]; then
    status="no"
    mismatch=$((mismatch + 1))
  fi

  printf '%-30s %-12s %-12s %-8s\n' "$table" "$src_count" "$tgt_count" "$status"
done

if [[ "$mismatch" -gt 0 ]]; then
  echo "Mismatches detected: $mismatch"
  exit 1
fi

echo "All compared tables match."
