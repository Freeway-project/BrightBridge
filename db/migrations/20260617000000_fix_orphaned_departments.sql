-- Fix departments whose parent_id points directly to the college (or is null)
-- instead of their correct school. The prior corrections migration used INSERT
-- with WHERE NOT EXISTS so it silently skipped departments that already existed
-- under the college. This migration explicitly re-parents them.

BEGIN;

-- Adult Upgrading → Arts & Foundational Programs
UPDATE public.organizational_units
SET parent_id = (
  SELECT id FROM public.organizational_units
  WHERE name = 'Arts & Foundational Programs' AND type = 'school'
  LIMIT 1
)
WHERE name = 'Adult Upgrading'
  AND type = 'department'
  AND (
    parent_id IS NULL
    OR parent_id = (SELECT id FROM public.organizational_units WHERE type = 'college' LIMIT 1)
  );

-- Early Childhood Education → Hall School of Business and Entrepreneurship
UPDATE public.organizational_units
SET parent_id = (
  SELECT id FROM public.organizational_units
  WHERE name = 'Hall School of Business and Entrepreneurship' AND type = 'school'
  LIMIT 1
)
WHERE name = 'Early Childhood Education'
  AND type = 'department'
  AND (
    parent_id IS NULL
    OR parent_id = (SELECT id FROM public.organizational_units WHERE type = 'college' LIMIT 1)
  );

-- English as a Second Language → Arts & Foundational Programs
UPDATE public.organizational_units
SET parent_id = (
  SELECT id FROM public.organizational_units
  WHERE name = 'Arts & Foundational Programs' AND type = 'school'
  LIMIT 1
)
WHERE name = 'English as a Second Language'
  AND type = 'department'
  AND (
    parent_id IS NULL
    OR parent_id = (SELECT id FROM public.organizational_units WHERE type = 'college' LIMIT 1)
  );

COMMIT;
