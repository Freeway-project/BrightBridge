#!/usr/bin/env bash
set -euo pipefail

# Validate app-level record access behavior on Postgres.
# This script does not require local npm dependencies.
#
# Required env (one of):
#   TARGET_DATABASE_URL or DATABASE_URL or DEV_DATABASE_URL

db_url="${TARGET_DATABASE_URL:-${DATABASE_URL:-${DEV_DATABASE_URL:-}}}"
if [[ -z "$db_url" ]]; then
	echo "ERROR: set TARGET_DATABASE_URL, DATABASE_URL, or DEV_DATABASE_URL" >&2
	exit 1
fi

psql_q() {
	local sql="$1"
	if command -v psql >/dev/null 2>&1; then
		psql "$db_url" -v ON_ERROR_STOP=1 -Atc "$sql"
	elif command -v docker >/dev/null 2>&1; then
		docker run --rm -i postgres:17-alpine psql "$db_url" -v ON_ERROR_STOP=1 -Atc "$sql"
	else
		echo "ERROR: neither psql nor docker is available to run validation queries." >&2
		exit 1
	fi
}

echo "Running app-access outcome validation against target Postgres..."

total_courses="$(psql_q "select count(*) from public.courses;")"
total_profiles="$(psql_q "select count(*) from public.profiles;")"

echo "Total profiles: $total_profiles"
echo "Total courses:  $total_courses"

# 1) Role-scoped visibility contract (mirrors app/service behavior)
staff_scope_mismatch="$(psql_q "
with expected as (
	select p.id as profile_id, count(distinct ca.course_id) as expected_count
	from public.profiles p
	left join public.course_assignments ca
		on ca.profile_id = p.id and ca.role = 'staff'
	where p.role = 'standard_user'
	group by p.id
),
actual as (
	select p.id as profile_id, count(distinct c.id) as actual_count
	from public.profiles p
	left join public.course_assignments ca
		on ca.profile_id = p.id and ca.role = 'staff'
	left join public.courses c
		on c.id = ca.course_id
	where p.role = 'standard_user'
	group by p.id
)
select count(*)
from expected e
join actual a using (profile_id)
where e.expected_count <> a.actual_count;
")"

instructor_scope_mismatch="$(psql_q "
with expected as (
	select p.id as profile_id, count(distinct ca.course_id) as expected_count
	from public.profiles p
	left join public.course_assignments ca
		on ca.profile_id = p.id and ca.role = 'instructor'
	where p.role = 'instructor'
	group by p.id
),
actual as (
	select p.id as profile_id, count(distinct c.id) as actual_count
	from public.profiles p
	left join public.course_assignments ca
		on ca.profile_id = p.id and ca.role = 'instructor'
	left join public.courses c
		on c.id = ca.course_id
	where p.role = 'instructor'
	group by p.id
)
select count(*)
from expected e
join actual a using (profile_id)
where e.expected_count <> a.actual_count;
")"

# 2) Admin roles should be globally visible in app logic (service returns all courses).
admin_profiles="$(psql_q "select count(*) from public.profiles where role in ('admin_full','admin_viewer','super_admin');")"

# 3) Data-shape checks that affect app-level outcomes.
orphaned_assignments="$(psql_q "
select count(*)
from public.course_assignments ca
left join public.profiles p on p.id = ca.profile_id
left join public.courses c on c.id = ca.course_id
where p.id is null or c.id is null;
")"

wrong_staff_links="$(psql_q "
select count(*)
from public.course_assignments ca
join public.profiles p on p.id = ca.profile_id
where ca.role = 'staff' and p.role <> 'standard_user';
")"

wrong_instructor_links="$(psql_q "
select count(*)
from public.course_assignments ca
join public.profiles p on p.id = ca.profile_id
where ca.role = 'instructor' and p.role <> 'instructor';
")"

duplicate_assignments="$(psql_q "
select count(*)
from (
	select course_id, profile_id, role, count(*) as n
	from public.course_assignments
	group by course_id, profile_id, role
	having count(*) > 1
) d;
")"

scoped_users_with_unassigned_courses="$(psql_q "
select count(*)
from public.profiles p
where p.role in ('standard_user','instructor')
	and exists (
		select 1
		from public.courses c
		where not exists (
			select 1
			from public.course_assignments ca
			where ca.course_id = c.id
				and ca.profile_id = p.id
				and ca.role = case
					when p.role = 'standard_user' then 'staff'
					when p.role = 'instructor' then 'instructor'
					else null
				end
		)
	);
")"

echo ""
echo "Summary"
echo "  Admin profiles (global app visibility): $admin_profiles"
echo "  Standard-user scope mismatches:        $staff_scope_mismatch"
echo "  Instructor scope mismatches:           $instructor_scope_mismatch"
echo "  Orphaned assignments:                  $orphaned_assignments"
echo "  Staff links to non-standard_user:      $wrong_staff_links"
echo "  Instructor links to non-instructor:    $wrong_instructor_links"
echo "  Duplicate assignments:                 $duplicate_assignments"
echo "  Scoped users with unassigned courses:  $scoped_users_with_unassigned_courses"

fail=0
if [[ "$staff_scope_mismatch" != "0" ]]; then fail=1; fi
if [[ "$instructor_scope_mismatch" != "0" ]]; then fail=1; fi
if [[ "$orphaned_assignments" != "0" ]]; then fail=1; fi
if [[ "$duplicate_assignments" != "0" ]]; then fail=1; fi

if [[ "$fail" -ne 0 ]]; then
	echo ""
	echo "Result: FAIL - one or more app-behavior invariants were violated." >&2
	exit 1
fi

echo ""
echo "Result: PASS - app-level access outcomes are consistent with expected behavior."
