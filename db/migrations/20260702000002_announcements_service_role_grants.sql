-- Grant service_role full access to the announcement tables.
-- The bulk service_role grant (20260505120000) only covers tables that existed
-- at that time. announcements and dismissed_announcements were created later
-- (20260702000000), so service_role got no privileges on them — causing the
-- admin client (service_role JWT) to receive "permission denied" on INSERT/UPDATE.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dismissed_announcements TO service_role;
