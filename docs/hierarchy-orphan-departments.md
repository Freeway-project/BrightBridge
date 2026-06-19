# Hierarchy: root-orphan departments

## The problem

Every department in `organizational_units` must hang off a **school**, which hangs
off the **college** (`Okanagan College`). The hierarchy explorer
(`apps/web/lib/hierarchy/explorer-queries.ts`) builds its tree by walking
`parent_id` **starting at the college**, so any unit whose `parent_id IS NULL`
is never reached — it is invisible in the UI.

A **root-orphan department** is a department with `parent_id IS NULL`. These get
created when a course import or a partial hierarchy seed inserts a *second*,
parent-less copy of a department that already exists under a school. The result
is one real department split across:

- a **visible** in-school copy (the "twin"), and
- a **hidden** orphan copy that silently collects courses no one can see.

The `UNIQUE NULLS NOT DISTINCT (name, parent_id)` constraint on
`organizational_units` does **not** stop this: the orphan (`parent_id = NULL`)
and the twin (`parent_id = <school>`) differ on `parent_id`, so both are allowed.

### Snapshot — prod, 2026-06-18

| Orphan (parent_id = NULL) | courses | In-school twin |
| --- | --- | --- |
| Adult Upgrading | 3 | Arts & Foundational Programs › Adult Upgrading (1 course) |
| Early Childhood Education | 0 | Health and Social Development › Early Childhood Education (65 courses) |
| English as a Second Language | 0 | Arts & Foundational Programs › English as a Second Language (24 courses) |

## Detect

```sql
-- Any department sitting at the root (outside the college tree):
SELECT o.id, o.name,
       (SELECT count(*) FROM courses c WHERE c.org_unit_id = o.id) AS courses,
       (SELECT count(*) FROM org_unit_members m WHERE m.org_unit_id = o.id) AS members
FROM public.organizational_units o
WHERE o.parent_id IS NULL AND o.type = 'department'
ORDER BY o.name;
```

Expected healthy result: **0 rows** (only `Okanagan College` should be at the root).

## Fix

Migration: [`db/migrations/20260618000000_collapse_root_orphan_departments.sql`](../db/migrations/20260618000000_collapse_root_orphan_departments.sql)

For every root-orphan department it resolves the same-named in-school twin,
re-homes the orphan's **courses, child units, and member positions** onto the
twin (re-home happens *before* the delete because the FKs are `ON DELETE SET
NULL` / `ON DELETE CASCADE` and would otherwise lose data), then deletes the
orphan. An orphan with **no** twin is left in place and reported via
`RAISE NOTICE` — nothing is ever silently dropped.

The migration is **generic and idempotent**: a second run finds no parent-less
departments and does nothing.

## ⚠️ Re-run this after a prod sync

Cloning prod into dev/staging carries these orphans along, and fresh course
imports can reintroduce them. After any prod → dev/staging sync, or after a bulk
course import, **re-run the fix**:

```bash
# whole migration set (skips already-applied files via schema_migrations):
npm run db:migrate:all

# or just this file against a chosen database:
node scripts/apply-migration.mjs db/migrations/20260618000000_collapse_root_orphan_departments.sql
```

Then re-run the detection query above and confirm it returns 0 rows.

## Resolved: Health Care Assistant miscategorization

`Health Care Assistant` was stranded under **Trades & Apprenticeship** because the
original import (`scripts/hierarchy_analysis.json`) mapped a batch of HSD
departments — Practical Nursing, Human Service Work, Health Care Assistant — to
Trades by default. The `20260615`/`20260617` migrations moved the first two into
Health and Social Development but missed Health Care Assistant. Fixed (idempotent)
by [`db/migrations/20260618000001_move_health_care_assistant_to_hsd.sql`](../db/migrations/20260618000001_move_health_care_assistant_to_hsd.sql);
applied to prod 2026-06-18.

## Related, NOT handled here

- **Mechanical Engineering split** — `Mech Engineering` (37 courses, head J. Laumer)
  vs `Mechanical Engineering Technology` (1 course, head L. Maley), both under
  Science & Technology. Likely a duplicate but `Mechanical Engineering
  Technology` is also a real distinct OC credential — confirm with the school
  before merging.
