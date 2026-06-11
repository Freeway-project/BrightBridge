-- Migrate existing course_escalations → course_issues
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
FROM public.course_escalations e;

-- Migrate escalation_messages → course_issue_comments
INSERT INTO public.course_issue_comments (issue_id, author_id, body, created_at)
SELECT
  ci.id,
  em.author_id,
  em.body,
  em.created_at
FROM public.escalation_messages em
JOIN public.course_issues ci ON ci.legacy_escalation_id = em.escalation_id;

-- ============================================================================
-- RLS POLICIES FOR COURSE_ISSUES
-- ============================================================================

-- SELECT: Assigned users + admins
CREATE POLICY "course_issues_select" ON public.course_issues
  FOR SELECT USING (
    auth.uid() IN (SELECT profile_id FROM public.course_assignments WHERE course_id = course_issues.course_id)
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_full', 'super_admin')
  );

-- INSERT: TA for migration only, Admin/Super for staging/provision
CREATE POLICY "course_issues_insert" ON public.course_issues
  FOR INSERT WITH CHECK (
    (phase = 'migration' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'standard_user')
    OR (phase IN ('staging', 'provision') AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_full', 'super_admin'))
  );

-- UPDATE: Status changes allowed for Admin/Super only
CREATE POLICY "course_issues_update_status" ON public.course_issues
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_full', 'super_admin')
  );

-- ============================================================================
-- RLS POLICIES FOR COURSE_ISSUE_COMMENTS
-- ============================================================================

-- SELECT: Same access as issue (assigned users + admins)
CREATE POLICY "course_issue_comments_select" ON public.course_issue_comments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT ca.profile_id
      FROM public.course_assignments ca
      JOIN public.course_issues ci ON ci.course_id = ca.course_id
      WHERE ci.id = course_issue_comments.issue_id
    )
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_full', 'super_admin')
  );

-- INSERT: Phase-aware comment permissions
CREATE POLICY "course_issue_comments_insert" ON public.course_issue_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.course_issues WHERE id = course_issue_comments.issue_id)
    AND (
      -- Admin/Super can always comment
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_full', 'super_admin')
      -- TA can comment in migration phase
      OR (
        (SELECT phase FROM public.course_issues WHERE id = course_issue_comments.issue_id) = 'migration'
        AND auth.uid() IN (SELECT profile_id FROM public.course_assignments WHERE course_id = (SELECT course_id FROM public.course_issues WHERE id = course_issue_comments.issue_id))
      )
      -- Instructor can comment in provision phase
      OR (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'instructor'
        AND (SELECT phase FROM public.course_issues WHERE id = course_issue_comments.issue_id) = 'provision'
      )
      -- TA in provision can comment only if @mentioned elsewhere in this issue
      OR (
        (SELECT phase FROM public.course_issues WHERE id = course_issue_comments.issue_id) = 'provision'
        AND auth.uid() IN (SELECT profile_id FROM public.course_assignments WHERE course_id = (SELECT course_id FROM public.course_issues WHERE id = course_issue_comments.issue_id))
        AND auth.uid() IN (
          SELECT DISTINCT icm.mentioned_profile_id
          FROM public.issue_comment_mentions icm
          JOIN public.course_issue_comments cic ON cic.id = icm.comment_id
          WHERE cic.issue_id = course_issue_comments.issue_id
        )
      )
    )
  );

-- ============================================================================
-- RLS POLICIES FOR ISSUE_COMMENT_MENTIONS
-- ============================================================================

-- SELECT: Same access as comment's issue
CREATE POLICY "issue_comment_mentions_select" ON public.issue_comment_mentions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT ca.profile_id
      FROM public.course_assignments ca
      JOIN public.course_issues ci ON ci.course_id = ca.course_id
      JOIN public.course_issue_comments cic ON cic.issue_id = ci.id
      WHERE cic.id = issue_comment_mentions.comment_id
    )
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_full', 'super_admin')
  );

-- INSERT: Only the comment author can add mentions
CREATE POLICY "issue_comment_mentions_insert" ON public.issue_comment_mentions
  FOR INSERT WITH CHECK (
    (SELECT author_id FROM public.course_issue_comments WHERE id = issue_comment_mentions.comment_id) = auth.uid()
  );
