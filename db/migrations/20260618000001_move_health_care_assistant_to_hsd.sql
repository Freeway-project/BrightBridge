-- Move "Health Care Assistant" from Trades & Apprenticeship to its correct
-- school, Health and Social Development.
--
-- WHY IT WAS UNDER TRADES
--   The original hierarchy import (scripts/hierarchy_analysis.json) mapped a
--   batch of Health & Social Development departments — Practical Nursing, Human
--   Service Work, and Health Care Assistant — to "Trades & Apprenticeship" by
--   default, even though all three department heads report to the HSD associate
--   deans (ttarlit@okanagan.bc.ca, dmarques@okanagan.bc.ca). Later cleanup
--   migrations (20260615 hsd_org_unit_reorg, 20260617 fix_orphaned_departments)
--   re-homed Practical Nursing and Human Service Work into the Health and Social
--   Development school but left Health Care Assistant behind, stranding it as the
--   lone health program under Trades.
--
-- Idempotent: re-parents the department only when an HSD school exists, the
-- department is not already under it, and HSD does not already contain a Health
-- Care Assistant (the latter guards the UNIQUE NULLS NOT DISTINCT (name,
-- parent_id) constraint). A second run is a no-op. Safe to re-run after a prod
-- sync — see docs/hierarchy-orphan-departments.md for the same pattern.

BEGIN;

UPDATE public.organizational_units AS d
SET parent_id = hsd.id
FROM public.organizational_units AS hsd
WHERE d.name = 'Health Care Assistant'
  AND d.type = 'department'
  AND hsd.name = 'Health and Social Development'
  AND hsd.type = 'school'
  AND d.parent_id IS DISTINCT FROM hsd.id
  AND NOT EXISTS (
    SELECT 1 FROM public.organizational_units existing
    WHERE existing.name = 'Health Care Assistant'
      AND existing.type = 'department'
      AND existing.parent_id = hsd.id
  );

COMMIT;
