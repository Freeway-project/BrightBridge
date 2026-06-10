-- Rename is_instructor → also_instructor for clarity
-- The flag only means something for admin_full users who also teach.
-- Pure instructor role users don't need it — their role already says it.

BEGIN;

ALTER TABLE public.profiles
  RENAME COLUMN is_instructor TO also_instructor;

DROP INDEX IF EXISTS profiles_is_instructor_idx;

CREATE INDEX profiles_also_instructor_idx ON public.profiles (also_instructor)
  WHERE also_instructor = true;

COMMIT;
