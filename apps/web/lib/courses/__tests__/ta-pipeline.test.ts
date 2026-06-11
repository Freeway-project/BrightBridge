import { describe, expect, it } from "vitest";
import { bucketTaPipeline, selectTodayCourses } from "../ta-pipeline";
import type { CourseSummary } from "../service";

function course(id: string, status: CourseSummary["status"], updatedAt: string): CourseSummary {
  return {
    id,
    sourceCourseId: id,
    title: `Course ${id}`,
    term: "F25",
    department: "CS",
    status,
    updatedAt,
    reviewProgress: undefined,
  } as CourseSummary;
}

describe("bucketTaPipeline", () => {
  it("buckets each status into the right segment", () => {
    const courses = [
      course("a", "assigned_to_ta", "2026-06-10T00:00:00Z"),       // todo
      course("b", "ta_review_in_progress", "2026-06-10T00:00:00Z"),// in_progress
      course("c", "submitted_to_admin", "2026-06-10T00:00:00Z"),   // pending_admin
      course("d", "final_approved", "2026-06-10T00:00:00Z"),       // done
      course("e", "admin_changes_requested", "2026-06-10T00:00:00Z"), // in_progress (TA-owned, mid-work)
    ];
    const buckets = bucketTaPipeline(courses);
    expect(buckets).toEqual({ todo: 1, inProgress: 2, pendingAdmin: 1, done: 1 });
  });

  it("returns all zeros for an empty list", () => {
    expect(bucketTaPipeline([])).toEqual({ todo: 0, inProgress: 0, pendingAdmin: 0, done: 0 });
  });
});

describe("selectTodayCourses", () => {
  const now = new Date("2026-06-11T12:00:00Z");

  it("returns only courses where the TA is the ball-in-court (staff)", () => {
    const courses = [
      course("ta-1", "ta_review_in_progress", "2026-06-10T00:00:00Z"),
      course("admin-1", "submitted_to_admin", "2026-06-10T00:00:00Z"),
      course("inst-1", "sent_to_instructor", "2026-06-10T00:00:00Z"),
      course("done-1", "final_approved", "2026-06-10T00:00:00Z"),
    ];
    const today = selectTodayCourses(courses, now);
    expect(today.map((c) => c.id)).toEqual(["ta-1"]);
  });

  it("caps at 4 items and ranks by most-recently-updated", () => {
    const courses = [
      course("old", "ta_review_in_progress", "2026-06-01T00:00:00Z"),
      course("new", "ta_review_in_progress", "2026-06-10T00:00:00Z"),
      course("mid", "ta_review_in_progress", "2026-06-05T00:00:00Z"),
      course("changes", "admin_changes_requested", "2026-06-09T00:00:00Z"),
      course("staging", "staging_in_progress", "2026-06-08T00:00:00Z"),
      course("just-assigned", "assigned_to_ta", "2026-06-11T00:00:00Z"),
    ];
    const today = selectTodayCourses(courses, now);
    expect(today).toHaveLength(4);
    expect(today.map((c) => c.id)).toEqual(["just-assigned", "new", "changes", "staging"]);
  });

  it("excludes courses last touched more than 14 days ago", () => {
    const courses = [
      course("stale", "ta_review_in_progress", "2026-05-01T00:00:00Z"),
      course("fresh", "ta_review_in_progress", "2026-06-10T00:00:00Z"),
    ];
    const today = selectTodayCourses(courses, now);
    expect(today.map((c) => c.id)).toEqual(["fresh"]);
  });
});
