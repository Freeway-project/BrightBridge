-- Sync any course_escalations not yet linked in course_issues (idempotent)
INSERT INTO public.course_issues (
  course_id, phase, type, severity, title, description,
  status, created_by, resolved_by, resolved_at,
  legacy_escalation_id, created_at, updated_at
)
SELECT
  e.course_id,
  'migration',
  'escalation',
  e.severity,
  e.title,
  NULL,
  CASE WHEN e.status = 'resolved' THEN 'resolved' ELSE 'open' END,
  e.created_by,
  e.resolved_by,
  e.resolved_at,
  e.id,
  e.created_at,
  e.created_at
FROM public.course_escalations e
WHERE NOT EXISTS (
  SELECT 1 FROM public.course_issues ci WHERE ci.legacy_escalation_id = e.id
);

-- Sync their messages (idempotent via created_at + author_id match)
INSERT INTO public.course_issue_comments (issue_id, author_id, body, created_at)
SELECT
  ci.id,
  em.author_id,
  em.body,
  em.created_at
FROM public.escalation_messages em
JOIN public.course_issues ci ON ci.legacy_escalation_id = em.escalation_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.course_issue_comments c
  WHERE c.issue_id = ci.id
    AND c.author_id = em.author_id
    AND c.created_at = em.created_at
);
