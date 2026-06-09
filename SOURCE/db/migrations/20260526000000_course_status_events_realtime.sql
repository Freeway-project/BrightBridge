-- Enable realtime on course_status_events so the client can subscribe to
-- status change events and push instant toasts without polling.
alter publication supabase_realtime add table public.course_status_events;
