-- ============================================================
-- Instructor Chat Unification
-- Backups question issues + replies, extends course_comments,
-- migrates data. Idempotent (safe to re-run).
-- ============================================================

BEGIN;

-- ---- 1. Backup tables (created once, never overwritten) ----

CREATE TABLE IF NOT EXISTS course_issues_questions_backup AS
  SELECT * FROM course_issues WHERE type = 'question' AND 1=0; -- schema only first

INSERT INTO course_issues_questions_backup
  SELECT ci.*
  FROM course_issues ci
  WHERE ci.type = 'question'
    AND NOT EXISTS (
      SELECT 1 FROM course_issues_questions_backup b WHERE b.id = ci.id
    );

CREATE TABLE IF NOT EXISTS course_issue_comments_backup AS
  SELECT cic.*
  FROM course_issue_comments cic
  WHERE 1=0; -- schema only first

INSERT INTO course_issue_comments_backup
  SELECT cic.*
  FROM course_issue_comments cic
  INNER JOIN course_issues ci ON ci.id = cic.issue_id
  WHERE ci.type = 'question'
    AND NOT EXISTS (
      SELECT 1 FROM course_issue_comments_backup b WHERE b.id = cic.id
    );

-- ---- 2. Schema: new columns on course_comments ----

ALTER TABLE course_comments
  ADD COLUMN IF NOT EXISTS is_question          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_answered          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS migrated_from_issue_id uuid REFERENCES course_issues(id);

-- ---- 3. Migrate question issues → course_comments ----

INSERT INTO course_comments (
  course_id, author_id, body, visibility,
  is_question, is_answered, created_at, acting_on_behalf_of,
  migrated_from_issue_id
)
SELECT
  ci.course_id,
  ci.created_by,
  CASE
    WHEN ci.description IS NOT NULL AND trim(ci.description) != ''
      THEN trim(ci.title) || E'\n\n' || trim(ci.description)
    ELSE trim(ci.title)
  END,
  'instructor_visible',
  true,
  -- mark answered if the question issue was already resolved
  (ci.status = 'resolved'),
  ci.created_at,
  NULL,
  ci.id
FROM course_issues ci
WHERE ci.type = 'question'
  AND NOT EXISTS (
    SELECT 1 FROM course_comments cc
    WHERE cc.migrated_from_issue_id = ci.id
  );

-- ---- 4. Migrate issue replies → flat course_comments ----
-- Only non-system-message replies, in chronological order.
-- We place them right after the question comment by using the
-- original created_at, which preserves timeline ordering.

INSERT INTO course_comments (
  course_id, author_id, body, visibility,
  is_question, is_answered, created_at, acting_on_behalf_of
)
SELECT
  ci.course_id,
  cic.author_id,
  cic.body,
  'instructor_visible',
  false,
  false,
  cic.created_at,
  cic.acting_on_behalf_of
FROM course_issue_comments cic
INNER JOIN course_issues ci ON ci.id = cic.issue_id
WHERE ci.type = 'question'
  AND cic.is_system_message = false
  -- Idempotency guard: skip if identical row already exists
  AND NOT EXISTS (
    SELECT 1 FROM course_comments cc
    WHERE cc.course_id = ci.course_id
      AND cc.author_id = cic.author_id
      AND cc.body = cic.body
      AND cc.visibility = 'instructor_visible'
      AND ABS(EXTRACT(EPOCH FROM (cc.created_at - cic.created_at))) < 1
  );

COMMIT;
