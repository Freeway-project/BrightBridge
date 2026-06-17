-- Fix three departments whose parent_id points directly to the college
-- instead of their correct school. Idempotent — safe to run multiple times.

BEGIN;

-- Adult Upgrading → Arts & Foundational Programs
UPDATE public.organizational_units
SET parent_id = (
  SELECT id FROM public.organizational_units
  WHERE name = 'Arts & Foundational Programs' AND type = 'school'
  LIMIT 1
)
WHERE name = 'Adult Upgrading' AND type = 'department';

-- Early Childhood Education → Health and Social Development
UPDATE public.organizational_units
SET parent_id = (
  SELECT id FROM public.organizational_units
  WHERE name = 'Health and Social Development' AND type = 'school'
  LIMIT 1
)
WHERE name = 'Early Childhood Education' AND type = 'department';

-- English as a Second Language → Arts & Foundational Programs
UPDATE public.organizational_units
SET parent_id = (
  SELECT id FROM public.organizational_units
  WHERE name = 'Arts & Foundational Programs' AND type = 'school'
  LIMIT 1
)
WHERE name = 'English as a Second Language' AND type = 'department';

COMMIT;
