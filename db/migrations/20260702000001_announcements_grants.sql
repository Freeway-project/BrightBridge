-- Grant SELECT to anon/authenticated so PostgREST can read the tables.
-- RLS policies alone don't grant access; the role also needs base table privileges.
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT SELECT ON public.dismissed_announcements TO anon, authenticated;

-- Allow authenticated users to manage their own dismissal row.
GRANT INSERT, UPDATE, DELETE ON public.dismissed_announcements TO authenticated;

-- Add to Realtime publication (IF NOT EXISTS guard via DO block).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
END $$;

-- Add dismissed_announcements RLS policy for authenticated users to manage their own row.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dismissed_announcements'
      AND policyname = 'users manage own dismissal'
  ) THEN
    CREATE POLICY "users manage own dismissal"
      ON public.dismissed_announcements
      FOR ALL TO authenticated
      USING (profile_id = auth.uid())
      WITH CHECK (profile_id = auth.uid());
  END IF;
END $$;
