-- NULL expires_at = never-expiring link (batch export magic links).
-- Existing rows keep their timestamp; only new batch-export invites use NULL.
ALTER TABLE review_invites ALTER COLUMN expires_at DROP NOT NULL;

-- Track how many times a never-expiring link has been clicked and when first clicked.
-- access_count stays 0 for one-time links (they use accepted_at instead).
ALTER TABLE review_invites
  ADD COLUMN access_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN first_accessed_at TIMESTAMPTZ;
