-- Org hierarchy corrections based on May 3 2026 updated data
-- Moves 4 departments to correct schools, creates 5 missing departments

BEGIN;

-- 1. Move Physics & Astronomy: Arts → Science & Technology
UPDATE public.organizational_units
SET parent_id = (SELECT id FROM public.organizational_units WHERE name = 'Science & Technology' AND type = 'school')
WHERE name = 'Physics & Astronomy' AND type = 'department';

-- 2. Move Sustainable Building Technology: Arts → Science & Technology
UPDATE public.organizational_units
SET parent_id = (SELECT id FROM public.organizational_units WHERE name = 'Science & Technology' AND type = 'school')
WHERE name = 'Sustainable Building Technology' AND type = 'department';

-- 3. Move Philosophy: Science & Technology → Arts & Foundational Programs
UPDATE public.organizational_units
SET parent_id = (SELECT id FROM public.organizational_units WHERE name = 'Arts & Foundational Programs' AND type = 'school')
WHERE name = 'Philosophy' AND type = 'department';

-- 4. Move Political Science: Science & Technology → Arts & Foundational Programs
UPDATE public.organizational_units
SET parent_id = (SELECT id FROM public.organizational_units WHERE name = 'Arts & Foundational Programs' AND type = 'school')
WHERE name = 'Political Science' AND type = 'department';

-- 5. Create Adult Upgrading under Arts & Foundational Programs
INSERT INTO public.organizational_units (name, type, parent_id)
SELECT 'Adult Upgrading', 'department',
  (SELECT id FROM public.organizational_units WHERE name = 'Arts & Foundational Programs' AND type = 'school')
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizational_units WHERE name = 'Adult Upgrading' AND type = 'department'
);

-- 6. Create Early Childhood Education under Business
INSERT INTO public.organizational_units (name, type, parent_id)
SELECT 'Early Childhood Education', 'department',
  (SELECT id FROM public.organizational_units WHERE name = 'Hall School of Business and Entrepreneurship' AND type = 'school')
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizational_units WHERE name = 'Early Childhood Education' AND type = 'department'
);

-- 7. Create English as a Second Language under Arts & Foundational Programs
INSERT INTO public.organizational_units (name, type, parent_id)
SELECT 'English as a Second Language', 'department',
  (SELECT id FROM public.organizational_units WHERE name = 'Arts & Foundational Programs' AND type = 'school')
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizational_units WHERE name = 'English as a Second Language' AND type = 'department'
);

-- 8. Create Pharmacy Technician Department under Business (primary)
INSERT INTO public.organizational_units (name, type, parent_id)
VALUES (
  'Pharmacy Technician Department', 'department',
  (SELECT id FROM public.organizational_units WHERE name = 'Hall School of Business and Entrepreneurship' AND type = 'school')
);

-- 9. Create Pharmacy Technician Department under Trades (dual listing)
INSERT INTO public.organizational_units (name, type, parent_id)
VALUES (
  'Pharmacy Technician Department', 'department',
  (SELECT id FROM public.organizational_units WHERE name = 'Trades & Apprenticeship' AND type = 'school')
);

COMMIT;
