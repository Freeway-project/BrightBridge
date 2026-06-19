-- Collapse root-orphan departments into their in-school twin.
--
-- WHY THIS EXISTS
--   Every department must hang off a school, which hangs off the college. A
--   department whose parent_id IS NULL is an "orphan": it sits OUTSIDE the
--   college tree and is therefore invisible in the hierarchy explorer
--   (apps/web/lib/hierarchy/explorer-queries.ts builds the tree from parent_id
--   starting at the college, so a parent-less unit is never reached). Course
--   imports and partial hierarchy seeds have repeatedly created a second,
--   parent-less copy of a department that already exists under a school. The
--   result is one real department split across a visible in-school copy and a
--   hidden orphan copy, with courses stranded on the hidden one.
--
--   As of 2026-06-18 prod had three such orphans (the in-school twin is shown):
--     - Adult Upgrading              (3 courses)  twin: Arts & Foundational Programs
--     - Early Childhood Education    (0 courses)  twin: Health and Social Development
--     - English as a Second Language (0 courses)  twin: Arts & Foundational Programs
--
-- WHAT IT DOES
--   Generic and re-runnable: for every department with parent_id IS NULL, if a
--   same-named department exists under a parent (its in-school twin), re-home
--   the orphan's courses, child units and member positions onto the twin, then
--   delete the orphan. Re-homing happens BEFORE the delete because the relevant
--   FKs would otherwise lose data: courses.org_unit_id and
--   organizational_units.parent_id are ON DELETE SET NULL, and org_unit_members
--   is ON DELETE CASCADE. An orphan with no twin is left in place and reported
--   via RAISE NOTICE, so nothing is ever silently lost.
--
--   Idempotent — a second run finds no parent-less departments and does nothing.
--
-- RE-RUN AFTER A PROD SYNC
--   Cloning prod into dev/staging carries these orphans along, and fresh course
--   imports can reintroduce them. Re-run this (it is part of `db:migrate:all`,
--   or apply the file directly) after any such sync. See
--   docs/hierarchy-orphan-departments.md.

BEGIN;

DO $$
DECLARE
  r         record;
  v_twin_id uuid;
BEGIN
  FOR r IN
    SELECT id, name
    FROM public.organizational_units
    WHERE parent_id IS NULL
      AND type = 'department'
  LOOP
    -- Resolve the in-school twin: same name, but actually parented. Prefer a
    -- twin whose parent is a school over any other parented copy.
    SELECT t.id INTO v_twin_id
    FROM public.organizational_units t
    LEFT JOIN public.organizational_units s ON s.id = t.parent_id
    WHERE t.name = r.name
      AND t.type = 'department'
      AND t.id <> r.id
      AND t.parent_id IS NOT NULL
    ORDER BY (s.type = 'school') DESC NULLS LAST
    LIMIT 1;

    IF v_twin_id IS NULL THEN
      RAISE NOTICE 'Orphan department "%" (%) has no in-school twin; leaving in place for manual review.', r.name, r.id;
      CONTINUE;
    END IF;

    -- Re-home dependents onto the surviving twin so the delete orphans nothing.
    UPDATE public.courses
       SET org_unit_id = v_twin_id
     WHERE org_unit_id = r.id;

    UPDATE public.organizational_units
       SET parent_id = v_twin_id
     WHERE parent_id = r.id;

    -- Move member positions not already present on the twin; the remainder are
    -- duplicates and are removed with the orphan (ON DELETE CASCADE). The
    -- org_unit_members UNIQUE(profile_id, org_unit_id) makes this guard required.
    UPDATE public.org_unit_members m
       SET org_unit_id = v_twin_id
     WHERE m.org_unit_id = r.id
       AND NOT EXISTS (
         SELECT 1 FROM public.org_unit_members b
         WHERE b.profile_id = m.profile_id
           AND b.org_unit_id = v_twin_id
       );

    DELETE FROM public.organizational_units WHERE id = r.id;

    RAISE NOTICE 'Collapsed orphan department "%" (%) into twin %.', r.name, r.id, v_twin_id;
  END LOOP;
END $$;

COMMIT;
