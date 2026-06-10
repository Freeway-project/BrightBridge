CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('standard_user', 'admin_full')),
  type text NOT NULL DEFAULT 'message' CHECK (type IN ('message', 'poke')),
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'read', 'resolved')),
  read_at timestamptz,
  resolved_at timestamptz,
  resolved_by_profile_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_status ON public.support_messages(status);
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at DESC);
CREATE INDEX idx_support_messages_sender_profile_id ON public.support_messages(sender_profile_id);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can read support messages" ON public.support_messages;
CREATE POLICY "Super admins can read support messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (public.current_app_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can read own support messages" ON public.support_messages;
CREATE POLICY "Users can read own support messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (sender_profile_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
