-- Add instructor as a valid global role and support dual-role admins who are also instructors

ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'super_admin'::text,
    'admin_full'::text,
    'admin_viewer'::text,
    'standard_user'::text,
    'instructor'::text
  ]));

ALTER TABLE public.profiles
  ADD COLUMN is_instructor boolean NOT NULL DEFAULT false;

CREATE INDEX profiles_is_instructor_idx ON public.profiles (is_instructor)
  WHERE is_instructor = true;
