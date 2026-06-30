-- Super-admin-controlled announcement banner visible to all users in the sidebar.
-- Single active row (upserted, never re-inserted). updated_at is the dismissal
-- fingerprint: editing re-shows the banner for everyone who dismissed it.

CREATE TABLE public.announcements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message       text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 280),
  severity      text NOT NULL DEFAULT 'info'
                  CHECK (severity IN ('info', 'warning', 'critical')),
  is_active     boolean NOT NULL DEFAULT false,
  created_by_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Realtime postgres_changes subscriptions require SELECT access on the table.
-- Anon key used by the browser client (project uses custom auth, not Supabase Auth).
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read announcements"
  ON public.announcements FOR SELECT
  TO anon, authenticated
  USING (true);

-- Enable Realtime for live push to all sidebar subscribers.
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

-- Per-user dismissal. dismissed_at_ts mirrors announcements.updated_at at dismiss time.
-- When updated_at changes (re-publish / edit), stored ts no longer matches → banner re-shows.
CREATE TABLE public.dismissed_announcements (
  profile_id      uuid NOT NULL REFERENCES public.profiles(id),
  dismissed_at_ts timestamptz NOT NULL,
  PRIMARY KEY (profile_id)
);

ALTER TABLE public.dismissed_announcements ENABLE ROW LEVEL SECURITY;
-- All writes go via service-role server actions; no client-facing write policy needed.
