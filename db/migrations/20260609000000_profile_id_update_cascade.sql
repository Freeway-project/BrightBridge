-- Add ON UPDATE CASCADE to every FK that references profiles(id).
--
-- Background: profile rows in prod were originally created with Supabase auth
-- UUIDs. After the Azure OIDC cutover the canonical user id is the Entra `oid`
-- claim, which is a different UUID. We want first-time-OIDC sign-in to be able
-- to rewrite profiles.id from the legacy Supabase UUID to the Entra oid (the
-- "link-by-email" pattern) without breaking the ~18 FKs that reference it.
--
-- ON DELETE behaviour is preserved per-constraint; only ON UPDATE is added.
-- Safe to re-run: each ALTER drops by name and recreates.

BEGIN;

ALTER TABLE course_assignments
  DROP CONSTRAINT IF EXISTS course_assignments_assigned_by_fkey,
  ADD  CONSTRAINT course_assignments_assigned_by_fkey
    FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE course_assignments
  DROP CONSTRAINT IF EXISTS course_assignments_profile_id_fkey,
  ADD  CONSTRAINT course_assignments_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE course_comments
  DROP CONSTRAINT IF EXISTS course_comments_author_id_fkey,
  ADD  CONSTRAINT course_comments_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE course_escalations
  DROP CONSTRAINT IF EXISTS course_escalations_created_by_fkey,
  ADD  CONSTRAINT course_escalations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE course_escalations
  DROP CONSTRAINT IF EXISTS course_escalations_resolved_by_fkey,
  ADD  CONSTRAINT course_escalations_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE course_issue_comments
  DROP CONSTRAINT IF EXISTS course_issue_comments_author_id_fkey,
  ADD  CONSTRAINT course_issue_comments_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE course_issues
  DROP CONSTRAINT IF EXISTS course_issues_created_by_fkey,
  ADD  CONSTRAINT course_issues_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE course_issues
  DROP CONSTRAINT IF EXISTS course_issues_owner_id_fkey,
  ADD  CONSTRAINT course_issues_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE course_issues
  DROP CONSTRAINT IF EXISTS course_issues_resolved_by_fkey,
  ADD  CONSTRAINT course_issues_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE course_status_events
  DROP CONSTRAINT IF EXISTS course_status_events_actor_id_fkey,
  ADD  CONSTRAINT course_status_events_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS courses_created_by_fkey,
  ADD  CONSTRAINT courses_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE escalation_messages
  DROP CONSTRAINT IF EXISTS escalation_messages_author_id_fkey,
  ADD  CONSTRAINT escalation_messages_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE issue_comment_mentions
  DROP CONSTRAINT IF EXISTS issue_comment_mentions_mentioned_profile_id_fkey,
  ADD  CONSTRAINT issue_comment_mentions_mentioned_profile_id_fkey
    FOREIGN KEY (mentioned_profile_id) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE org_unit_members
  DROP CONSTRAINT IF EXISTS org_unit_members_profile_id_fkey,
  ADD  CONSTRAINT org_unit_members_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE review_invites
  DROP CONSTRAINT IF EXISTS review_invites_created_by_fkey,
  ADD  CONSTRAINT review_invites_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE review_responses
  DROP CONSTRAINT IF EXISTS review_responses_responded_by_fkey,
  ADD  CONSTRAINT review_responses_responded_by_fkey
    FOREIGN KEY (responded_by) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE support_messages
  DROP CONSTRAINT IF EXISTS support_messages_resolved_by_profile_id_fkey,
  ADD  CONSTRAINT support_messages_resolved_by_profile_id_fkey
    FOREIGN KEY (resolved_by_profile_id) REFERENCES profiles(id) ON UPDATE CASCADE;

ALTER TABLE support_messages
  DROP CONSTRAINT IF EXISTS support_messages_sender_profile_id_fkey,
  ADD  CONSTRAINT support_messages_sender_profile_id_fkey
    FOREIGN KEY (sender_profile_id) REFERENCES profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;

COMMIT;
