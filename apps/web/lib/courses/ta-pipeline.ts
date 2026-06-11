import { getBallInCourt, type CourseStatus } from "@coursebridge/workflow";
import type { CourseSummary } from "./service";

export type PipelineBuckets = {
  todo: number;
  inProgress: number;
  pendingAdmin: number;
  done: number;
};

const TODO_STATUSES = new Set<CourseStatus>(["assigned_to_ta"]);
const IN_PROGRESS_STATUSES = new Set<CourseStatus>([
  "ta_review_in_progress",
  "admin_changes_requested",
  "staging_in_progress",
]);
const PENDING_ADMIN_STATUSES = new Set<CourseStatus>([
  "course_created",
  "submitted_to_admin",
  "waiting_on_admin",
  "ready_for_instructor",
  "sent_to_instructor",
  "instructor_viewing",
  "instructor_questions",
  "instructor_approved",
]);
const DONE_STATUSES = new Set<CourseStatus>(["final_approved"]);

export function bucketTaPipeline(courses: CourseSummary[]): PipelineBuckets {
  const out: PipelineBuckets = { todo: 0, inProgress: 0, pendingAdmin: 0, done: 0 };
  for (const c of courses) {
    if (TODO_STATUSES.has(c.status)) out.todo += 1;
    else if (IN_PROGRESS_STATUSES.has(c.status)) out.inProgress += 1;
    else if (PENDING_ADMIN_STATUSES.has(c.status)) out.pendingAdmin += 1;
    else if (DONE_STATUSES.has(c.status)) out.done += 1;
  }
  return out;
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const TODAY_LIMIT = 4;

export function countOwnedByTa(courses: CourseSummary[]): number {
  return courses.filter((c) => getBallInCourt(c.status) === "staff").length;
}

export function selectTodayCourses(courses: CourseSummary[], now: Date = new Date()): CourseSummary[] {
  const cutoff = now.getTime() - FOURTEEN_DAYS_MS;
  return courses
    .filter((c) => getBallInCourt(c.status) === "staff")
    .filter((c) => new Date(c.updatedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, TODAY_LIMIT);
}
