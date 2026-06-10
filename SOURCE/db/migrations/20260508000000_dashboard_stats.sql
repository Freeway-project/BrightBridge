-- View for status counts
CREATE OR REPLACE VIEW course_status_counts AS
SELECT status, count(*) as count
FROM courses
GROUP BY status;

-- View for TA workload
CREATE OR REPLACE VIEW ta_workload_stats AS
SELECT 
    p.id as profile_id,
    p.full_name,
    p.email,
    COUNT(ca.id) FILTER (WHERE c.status NOT IN ('final_approved', 'submitted_to_admin')) as active_courses,
    COUNT(ca.id) FILTER (WHERE c.status = 'admin_changes_requested') as needs_fixes
FROM profiles p
LEFT JOIN course_assignments ca ON p.id = ca.profile_id AND ca.role = 'staff'
LEFT JOIN courses c ON ca.course_id = c.id
WHERE p.role = 'standard_user'
GROUP BY p.id, p.full_name, p.email;

-- Grant access
GRANT SELECT ON course_status_counts TO authenticated, service_role;
GRANT SELECT ON ta_workload_stats TO authenticated, service_role;
