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

-- RLS Policies for course_issues

-- SELECT: Users assigned to course or admin
CREATE POLICY "course_issues_select" ON public.course_issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_assignments ca
      WHERE ca.course_id = course_issues.course_id
        AND ca.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin_full', 'super_admin')
    )
  );

-- INSERT: TA for migration, staging role for staging, admin for provision
CREATE POLICY "course_issues_insert" ON public.course_issues
  FOR INSERT WITH CHECK (
    (
      phase = 'migration'
      AND EXISTS (
        SELECT 1 FROM public.course_assignments ca
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE ca.course_id = course_issues.course_id
          AND ca.profile_id = auth.uid()
          AND p.role = 'standard_user'
      )
    )
    OR (
      phase IN ('staging', 'provision')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin_full', 'super_admin')
      )
    )
  );

-- UPDATE status: Admin always, TA only for own issues in migration
CREATE POLICY "course_issues_update_status" ON public.course_issues
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin_full', 'super_admin')
    )
    OR (
      phase = 'migration'
      AND created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'standard_user'
      )
    )
  );

-- RLS Policies for course_issue_comments

-- SELECT: Same as course_issues (via issue)
CREATE POLICY "course_issue_comments_select" ON public.course_issue_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_issues ci
      WHERE ci.id = course_issue_comments.issue_id
        AND EXISTS (
          SELECT 1 FROM public.course_assignments ca
          WHERE ca.course_id = ci.course_id
            AND ca.profile_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin_full', 'super_admin')
        )
    )
  );

-- INSERT: depends on phase and provision @mention logic
CREATE POLICY "course_issue_comments_insert" ON public.course_issue_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.course_issues ci
      WHERE ci.id = course_issue_comments.issue_id
    )
    AND (
      -- Admin/super_admin can always comment
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin_full', 'super_admin')
      )
      -- TA in migration phase can comment
      OR (
        EXISTS (
          SELECT 1 FROM public.course_issues ci
          WHERE ci.id = course_issue_comments.issue_id
            AND ci.phase = 'migration'
            AND ci.course_id IN (
              SELECT course_id FROM public.course_assignments ca
              WHERE ca.profile_id = auth.uid()
            )
        )
      )
      -- Instructor can comment on any phase
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'instructor'
      )
      -- TA in provision can comment only if mentioned in this issue
      OR (
        EXISTS (
          SELECT 1 FROM public.course_issues ci
          WHERE ci.id = course_issue_comments.issue_id
            AND ci.phase = 'provision'
            AND ci.course_id IN (
              SELECT course_id FROM public.course_assignments ca
              WHERE ca.profile_id = auth.uid()
            )
            AND EXISTS (
              SELECT 1 FROM public.issue_comment_mentions icm
              JOIN public.course_issue_comments cic ON cic.id = icm.comment_id
              WHERE cic.issue_id = ci.id
                AND icm.mentioned_profile_id = auth.uid()
            )
        )
      )
    )
  );

-- RLS Policies for issue_comment_mentions

CREATE POLICY "issue_comment_mentions_select" ON public.issue_comment_mentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_issue_comments cic
      WHERE cic.id = issue_comment_mentions.comment_id
        AND EXISTS (
          SELECT 1 FROM public.course_issues ci
          WHERE ci.id = cic.issue_id
            AND (
              EXISTS (
                SELECT 1 FROM public.course_assignments ca
                WHERE ca.course_id = ci.course_id
                  AND ca.profile_id = auth.uid()
              )
              OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.role IN ('admin_full', 'super_admin')
              )
            )
        )
    )
  );

CREATE POLICY "issue_comment_mentions_insert" ON public.issue_comment_mentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_issue_comments cic
      WHERE cic.id = issue_comment_mentions.comment_id
        AND cic.author_id = auth.uid()
    )
  );
