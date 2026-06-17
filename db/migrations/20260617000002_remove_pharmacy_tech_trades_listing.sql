-- Remove the duplicate "Pharmacy Technician Department" dual-listing under the
-- Trades school, keeping the primary listing under the Hall School of Business.
--
-- Migration 20260503300000 deliberately created this department twice (steps 8 & 9):
-- once under "Hall School of Business and Entrepreneurship" and once under the
-- Trades school. This removes the Trades copy. Before deleting it, any courses,
-- child units, or member positions attached to the Trades copy are re-homed onto
-- the surviving Business copy so nothing is orphaned (FK defaults would otherwise
-- null out courses/children and cascade-delete members).
--
-- The Trades school is matched loosely (its stored name varies between
-- "Trades & Apprenticeship" and "Trades and Vocational"). Idempotent — safe to
-- run multiple times; a second run finds nothing to remove.

BEGIN;

DO $$
DECLARE
  v_business_id uuid;
  v_trades_id   uuid;
BEGIN
  -- Surviving listing: Pharmacy Technician under the Business school.
  SELECT d.id INTO v_business_id
  FROM public.organizational_units d
  JOIN public.organizational_units s ON s.id = d.parent_id
  WHERE d.name = 'Pharmacy Technician Department' AND d.type = 'department'
    AND s.type = 'school'
    AND s.name = 'Hall School of Business and Entrepreneurship'
  LIMIT 1;

  -- Duplicate listing: Pharmacy Technician under a Trades-ish school.
  SELECT d.id INTO v_trades_id
  FROM public.organizational_units d
  JOIN public.organizational_units s ON s.id = d.parent_id
  WHERE d.name = 'Pharmacy Technician Department' AND d.type = 'department'
    AND s.type = 'school'
    AND s.name ILIKE '%trades%'
  LIMIT 1;

  IF v_trades_id IS NULL THEN
    RAISE NOTICE 'No Pharmacy Technician Department under a Trades school; nothing to remove.';
    RETURN;
  END IF;

  -- Re-home dependents onto the surviving Business listing (only if it exists
  -- and is a different row), so the delete orphans nothing.
  IF v_business_id IS NOT NULL AND v_business_id <> v_trades_id THEN
    UPDATE public.courses
       SET org_unit_id = v_business_id
     WHERE org_unit_id = v_trades_id;

    UPDATE public.organizational_units
       SET parent_id = v_business_id
     WHERE parent_id = v_trades_id;

    -- Move member positions not already present on the Business listing; the
    -- remainder are duplicates and are removed with the unit (on delete cascade).
    UPDATE public.org_unit_members m
       SET org_unit_id = v_business_id
     WHERE m.org_unit_id = v_trades_id
       AND NOT EXISTS (
         SELECT 1 FROM public.org_unit_members b
         WHERE b.profile_id = m.profile_id
           AND b.org_unit_id = v_business_id
       );
  END IF;

  DELETE FROM public.organizational_units WHERE id = v_trades_id;

  RAISE NOTICE 'Removed Pharmacy Technician Department (Trades listing) %', v_trades_id;
END $$;

COMMIT;
