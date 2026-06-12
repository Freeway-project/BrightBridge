-- Add password_hash column to profiles for email/password authentication.
-- Nullable so existing profile rows remain valid during the transition.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash text;
