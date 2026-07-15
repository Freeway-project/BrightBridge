/**
 * Pure staleness-bucketing logic for the Instructor Handoff Tracker.
 *
 * No DB, no `server-only` — safe to import from both the server query wrapper
 * and client components. All time math takes an explicit `now` so it is
 * deterministic and unit-testable.
 */

export type HandoffBucket = "fresh" | "aging" | "overdue";

/**
 * Day thresholds for the staleness buckets. This is the single knob to tune as
 * the handoff SLA evolves — everything downstream derives from it.
 *
 * - days < `agingDays`      → fresh   (green)
 * - `agingDays` ≤ days < `overdueDays` → aging (amber)
 * - days ≥ `overdueDays`    → overdue (red)
 */
export const HANDOFF_THRESHOLDS = {
  agingDays: 3,
  overdueDays: 7,
} as const;

/** Whole days between an ISO timestamp and `now` (ms). Null passes through. */
export function daysSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((now - then) / 86_400_000);
}

/**
 * Bucket a course by how many days ago it was sent to the instructor. A null
 * day-count (no recorded send event — a data anomaly) is treated as `fresh` so
 * it never raises a false overdue alarm.
 */
export function bucketForDays(days: number | null): HandoffBucket {
  if (days === null) return "fresh";
  if (days >= HANDOFF_THRESHOLDS.overdueDays) return "overdue";
  if (days >= HANDOFF_THRESHOLDS.agingDays) return "aging";
  return "fresh";
}

/** The minimal per-course shape the summary aggregation needs. */
export interface HandoffClassification {
  bucket: HandoffBucket;
  daysSinceSent: number | null;
  opened: boolean;
  hasQuestions: boolean;
}

export interface HandoffSummary {
  total: number;
  fresh: number;
  aging: number;
  overdue: number;
  /** Opened at least once by the assigned instructor. */
  opened: number;
  /** Never opened by the instructor ("untouched"). */
  neverOpened: number;
  /** Status is `instructor_questions`. */
  hasQuestions: number;
  /** Overdue AND never opened — the most urgent slice. */
  overdueUnopened: number;
  /** Share opened at least once, as a whole 0–100 percent. 0 when total is 0. */
  openRate: number;
  /** Mean whole-days-since-sent over courses with a known send date; null if none. */
  avgDaysSinceSent: number | null;
  /** Largest whole-days-since-sent (the longest-waiting course); null if none. */
  oldestDaysSinceSent: number | null;
}

/** Roll a set of classified courses up into bucket, engagement, and timing stats. */
export function summarize(items: readonly HandoffClassification[]): HandoffSummary {
  const summary: HandoffSummary = {
    total: items.length,
    fresh: 0,
    aging: 0,
    overdue: 0,
    opened: 0,
    neverOpened: 0,
    hasQuestions: 0,
    overdueUnopened: 0,
    openRate: 0,
    avgDaysSinceSent: null,
    oldestDaysSinceSent: null,
  };

  let dayTotal = 0;
  let dayCount = 0;

  for (const item of items) {
    summary[item.bucket] += 1;
    if (item.opened) summary.opened += 1;
    else summary.neverOpened += 1;
    if (item.hasQuestions) summary.hasQuestions += 1;
    if (item.bucket === "overdue" && !item.opened) summary.overdueUnopened += 1;

    if (item.daysSinceSent !== null) {
      dayTotal += item.daysSinceSent;
      dayCount += 1;
      if (
        summary.oldestDaysSinceSent === null ||
        item.daysSinceSent > summary.oldestDaysSinceSent
      ) {
        summary.oldestDaysSinceSent = item.daysSinceSent;
      }
    }
  }

  summary.openRate = summary.total > 0 ? Math.round((summary.opened / summary.total) * 100) : 0;
  summary.avgDaysSinceSent = dayCount > 0 ? Math.round(dayTotal / dayCount) : null;

  return summary;
}
