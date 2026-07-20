/**
 * Pure classification/ordering logic for the instructor dashboard's pending
 * overview (overdue reminder banner + pending-course cards).
 *
 * No DB, no `server-only` — mirrors `lib/admin/handoff-buckets.ts`, whose
 * thresholds it reuses so "overdue" means the same thing here as it does on the
 * admin handoff tracker. All time math takes an explicit `now` so it is
 * deterministic and unit-testable.
 */

import {
  bucketForDays,
  daysSince,
  type HandoffBucket,
} from "@/lib/admin/handoff-buckets";
import type { InstructorPendingCourse } from "@/lib/repositories/contracts";

export interface PendingCourseView extends InstructorPendingCourse {
  /** Whole days since the course was sent to the instructor; null if never recorded. */
  daysSinceSent: number | null;
  bucket: HandoffBucket;
  /** Whether this instructor has ever opened the course. */
  visited: boolean;
}

/**
 * Most-pending-first ordering: longest-waiting courses on top (an unrecorded
 * send date counts as just-sent, so it sinks), never-opened before opened at
 * equal age, title as a stable final tie-break.
 */
function byMostPending(a: PendingCourseView, b: PendingCourseView): number {
  return (
    (b.daysSinceSent ?? -1) - (a.daysSinceSent ?? -1) ||
    Number(a.visited) - Number(b.visited) ||
    a.title.localeCompare(b.title)
  );
}

/** Classify + sort the instructor's pending courses, most pending first. */
export function classifyPendingCourses(
  courses: readonly InstructorPendingCourse[],
  now: number,
): PendingCourseView[] {
  return courses
    .map((course) => {
      const daysSinceSent = daysSince(course.sentAt, now);
      return {
        ...course,
        daysSinceSent,
        bucket: bucketForDays(daysSinceSent),
        visited: course.firstOpenedAt !== null,
      };
    })
    .sort(byMostPending);
}

/**
 * Courses that trigger the reminder banner: overdue (≥ 7 days since sent) AND
 * never opened by this instructor.
 */
export function overdueUnvisited(
  courses: readonly PendingCourseView[],
): PendingCourseView[] {
  return courses.filter((c) => c.bucket === "overdue" && !c.visited);
}
