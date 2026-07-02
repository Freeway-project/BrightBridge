-- Remediation: the original announcements migration (20260630000000) was
-- bootstrapped as "applied" on production without actually executing because
-- schema_migrations was empty at the time. Re-create with IF NOT EXISTS guards.

CREATE TABLE IF NOT EXISTS public.announcements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message       text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 280),
  severity      text NOT NULL DEFAULT 'info'
                  CHECK (severity IN ('info', 'warning', 'critical')),
  is_active     boolean NOT NULL DEFAULT false,
  created_by_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'announcements' AND policyname = 'anyone can read announcements'
  ) THEN
    CREATE POLICY "anyone can read announcements"
      ON public.announcements FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.dismissed_announcements (
  profile_id      uuid NOT NULL REFERENCES public.profiles(id),
  dismissed_at_ts timestamptz NOT NULL,
  PRIMARY KEY (profile_id)
);

ALTER TABLE public.dismissed_announcements ENABLE ROW LEVEL SECURITY;

-- Reload PostgREST schema cache so the tables are immediately accessible.
SELECT pg_notify('pgrst', 'reload schema');
