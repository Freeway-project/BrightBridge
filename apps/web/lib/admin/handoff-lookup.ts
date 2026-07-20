/**
 * Pure mapping from the handoff tracker's course list to a per-course lookup
 * for the /admin dashboard (Send tab column + board chips).
 *
 * Returns a plain Record, not a Map: the RSC page must pass it as a prop to
 * "use client" components, and Maps don't survive the RSC boundary. No DB,
 * no `server-only` — same import rules as handoff-buckets.ts.
 */
import type { HandoffBucket } from "./handoff-buckets";

export interface HandoffLookupEntry {
  daysSinceSent: number | null;
  bucket: HandoffBucket;
  opened: boolean;
}

/**
 * Keyed by course id. Courses the tracker excludes (instructor_approved, or
 * anything outside the three handoff statuses) are simply absent — consumers
 * treat a miss as "no staleness to show".
 */
export type HandoffLookup = Record<string, HandoffLookupEntry>;

interface HandoffLookupSource {
  id: string;
  daysSinceSent: number | null;
  bucket: HandoffBucket;
  opened: boolean;
}

export function buildHandoffLookup(
  courses: readonly HandoffLookupSource[] | null | undefined,
): HandoffLookup {
  const lookup: HandoffLookup = {};
  if (!courses) return lookup;
  for (const course of courses) {
    lookup[course.id] = {
      daysSinceSent: course.daysSinceSent,
      bucket: course.bucket,
      opened: course.opened,
    };
  }
  return lookup;
}
