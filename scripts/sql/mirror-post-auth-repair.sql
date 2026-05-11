-- Run on DEV immediately after restoring auth.users + auth.identities from production.
-- 1) JWT / GoTrue instance is per-project — align all rows with this project's auth.instances.
-- 2) GoTrue treats NULL token columns as errors — normalize to empty string.

UPDATE auth.users u
SET instance_id = (SELECT i.id FROM auth.instances i LIMIT 1);

UPDATE auth.users SET
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  recovery_token = COALESCE(recovery_token, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, '');
