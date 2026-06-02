# Migration Run Record — May 8, 2026 (UTC)

This file records what happened during the TA-form migration run and what still needs fixing.

## Environment

- Target DB: **dev**
- Supabase project ref: `usijcptcubkddpkgervf`
- Script: `scripts/migrate-courses-from-csv.mjs`
- Input file: `Gate 01 (QI) – TA Course Review Form (2)/Responses-Table 1.csv`

## Run Outcome (Live Run)

- CSV rows processed: **95**
- Existing courses updated/enriched: **37**
- New courses created: **58**
- Orphan active courses partially enriched: **964**
- Staff assignments added: **0**

## What Was Fixed in Script Before Run

- Weak `Course Code` values can swap to `Course Title` for safer course reference matching.
- Invalid/missing term values are left blank (`null`) instead of forcing bad data.
- URLs with missing protocol are normalized to `https://...`.
- Placeholder URL values (`na`, `null`, `blank`, `-`) become empty.

## Data Quality Audit Summary (Same CSV)

- Code/title swaps: **24**
- Blank terms after normalization: **4**
- URL auto-fix rows: **3**
- URL auto-fixed cells: **5**

## Known Problem: Staff Assignment Mapping

The run added **0** staff assignments because TA profile resolution did not map to existing `standard_user` profiles as intended for this file shape.

Action still needed:

- Prioritize reviewer-name mapping for TA-form files.
- Ignore non-authoritative `Email` values such as `anonymous` for TA mapping.
- Re-run assignment step on dev after resolver fix.

## Problematic Rows (From Audit)

### 1) Invalid/placeholder URLs (raw values)

- Row 16
  - Moodle Course URL: `mymoodle.okanagan.bc.ca/course/view.php?id=182526`
- Row 29
  - Moodle Course URL: `mymoodle.okanagan.bc.ca/course/section.php?id=1446979#module-3658491`
  - Brightspace Course URL: `learnokanagancollege.ca/d2l/home/8604`
- Row 30
  - Moodle Course URL: `mymoodle.okanagan.bc.ca/course/section.php?id=1447020#module-3658648`
  - Brightspace Course URL: `learn.okanagancollege.ca/d2l/home/8600`
- Row 73
  - Brightspace Course URL: `na`

### 2) Blank/invalid term rows

- Invalid term code:
  - Row 35: `Course Term = 202641` (suffix `41` is invalid)
- Term could not be derived safely:
  - Rows: **11, 35, 40, 69**

### 3) Code/title confusion rows (swapped)

Rows where weak Course Code was replaced with Course Title for matching:

`9, 12, 14, 29, 30, 34, 35, 36, 37, 38, 39, 40, 46, 54, 55, 57, 58, 60, 67, 71, 73, 76, 90, 95`

### 4) Link/notes mixed content rows

Rows where free text and links are mixed in link-like fields:

`13, 16, 18, 23, 24, 25, 28, 29, 30, 42, 49, 64, 80, 82`

## DB Impact Notes

- Course metadata columns (`source_course_id`, `target_course_id`, `org_unit_id`, plus status where applicable) were updated for matched rows.
- New course rows were created for unmatched references.
- No instructor assignments were created in this run.
- No `review_responses` or `course_comments` were imported/modified by this run.

## Recommended Next Fix Pass

1. Fix TA resolver to map `Reviewer` -> existing `profiles.role = standard_user`.
2. Re-run **assignment-only** logic on dev.
3. Add optional guard flag to skip large orphan-course enrichment when running TA-form imports.
4. Add migration report artifact (JSON) for each run and show it in Admin UI “Migration” tab.

