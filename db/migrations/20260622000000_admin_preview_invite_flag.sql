-- Admin-generated preview links must not trigger course status transitions or
-- inflate instructor view counts. The route skips those side-effects when this
-- flag is set, so only the real instructor opening their link affects course state.
ALTER TABLE review_invites
  ADD COLUMN is_admin_preview BOOLEAN NOT NULL DEFAULT FALSE;
