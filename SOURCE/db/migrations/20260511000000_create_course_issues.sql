-- Unified issue tracker replacing course_escalations + JSONB issue log

CREATE TABLE public.course_issues (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id             uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  phase                 text NOT NULL CHECK (phase IN ('migration', 'staging', 'provision')),
  type                  text NOT NULL CHECK (type IN ('escalation', 'question', 'fix_needed', 'general')),
  severity              text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  title                 text NOT NULL,
  description           text,
  location              text,
  direct_link           text,
  status                text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved')),
  owner_id              uuid REFERENCES public.profiles(id),
  created_by            uuid NOT NULL REFERENCES public.profiles(id),
  resolved_by           uuid REFERENCES public.profiles(id),
  resolved_at           timestamptz,
  legacy_escalation_id  uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.course_issue_comments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id         uuid NOT NULL REFERENCES public.course_issues(id) ON DELETE CASCADE,
  author_id        uuid NOT NULL REFERENCES public.profiles(id),
  body             text NOT NULL,
  is_system_message boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.issue_comment_mentions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id           uuid NOT NULL REFERENCES public.course_issue_comments(id) ON DELETE CASCADE,
  mentioned_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_course_issues_course_id ON public.course_issues(course_id);
CREATE INDEX idx_course_issues_status    ON public.course_issues(status);
CREATE INDEX idx_course_issues_phase     ON public.course_issues(phase);
CREATE INDEX idx_issue_comments_issue_id ON public.course_issue_comments(issue_id);
CREATE INDEX idx_mentions_profile        ON public.issue_comment_mentions(mentioned_profile_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_issue_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.issue_comment_mentions;

-- Enable RLS (policies set in next migration)
ALTER TABLE public.course_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_comment_mentions ENABLE ROW LEVEL SECURITY;
