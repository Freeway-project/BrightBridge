import { describe, expect, it } from "vitest";
import {
  COURSE_STATUSES,
  STAFF_ACTIONABLE_COURSE_STATUSES,
  getBallInCourt,
  getStaffAdvance,
  type CourseStatus,
} from "./statuses";

describe("getBallInCourt", () => {
  const expected: Record<CourseStatus, ReturnType<typeof getBallInCourt>> = {
    course_created: "admin",
    assigned_to_ta: "staff",
    ta_review_in_progress: "staff",
    submitted_to_admin: "admin",
    admin_changes_requested: "staff",
    waiting_on_admin: "admin",
    staging_in_progress: "staff",
    ready_for_instructor: "admin",
    sent_to_instructor: "instructor",
    instructor_viewing: "instructor",
    instructor_questions: "instructor",
    instructor_approved: "admin",
    final_approved: "done",
  };

  it.each(COURSE_STATUSES)("maps %s to its owner", (status) => {
    expect(getBallInCourt(status)).toBe(expected[status]);
  });
});

describe("getStaffAdvance", () => {
  it("returns Submit to Admin for in-progress review", () => {
    expect(getStaffAdvance("ta_review_in_progress")).toEqual({
      to: "submitted_to_admin",
      action: "submit",
      ctaLabel: "Submit to Admin",
    });
  });

  it("requires a note when resubmitting after changes", () => {
    expect(getStaffAdvance("admin_changes_requested")).toEqual({
      to: "submitted_to_admin",
      action: "submit",
      ctaLabel: "Resubmit to Admin",
      requiresNote: true,
    });
  });

  it("finalizes staging to ready_for_instructor", () => {
    expect(getStaffAdvance("staging_in_progress")).toEqual({
      to: "ready_for_instructor",
      action: "finalize-staging",
      ctaLabel: "Mark Ready for Instructor",
    });
  });

  it("returns null for non-staff-actionable statuses", () => {
    expect(getStaffAdvance("submitted_to_admin")).toBeNull();
    expect(getStaffAdvance("final_approved")).toBeNull();
  });

  it("is non-null for exactly STAFF_ACTIONABLE_COURSE_STATUSES", () => {
    const nonNull = COURSE_STATUSES.filter((s) => getStaffAdvance(s) !== null).sort();
    expect(nonNull).toEqual([...STAFF_ACTIONABLE_COURSE_STATUSES].sort());
  });
});
