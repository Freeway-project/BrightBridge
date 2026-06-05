import { describe, expect, it } from "vitest";
import {
  COURSE_STATUSES,
  COURSE_STATUS_LABELS,
  INSTRUCTOR_ACTIONABLE_COURSE_STATUSES,
  STAFF_ACTIONABLE_COURSE_STATUSES,
  WORKFLOW_PHASES,
  getBallInCourt,
  getPipelineStage,
  getStaffAdvance,
  isInstructorActionableStatus,
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

describe("isInstructorActionableStatus", () => {
  it("is true only while the course is awaiting the instructor's decision", () => {
    expect(isInstructorActionableStatus("sent_to_instructor")).toBe(true);
    expect(isInstructorActionableStatus("instructor_viewing")).toBe(true);
  });

  it("is false once the instructor has responded or before it reaches them", () => {
    expect(isInstructorActionableStatus("instructor_questions")).toBe(false);
    expect(isInstructorActionableStatus("instructor_approved")).toBe(false);
    expect(isInstructorActionableStatus("final_approved")).toBe(false);
    expect(isInstructorActionableStatus("ready_for_instructor")).toBe(false);
    expect(isInstructorActionableStatus("ta_review_in_progress")).toBe(false);
  });

  it("is true for exactly INSTRUCTOR_ACTIONABLE_COURSE_STATUSES", () => {
    const actionable = COURSE_STATUSES.filter(isInstructorActionableStatus).sort();
    expect(actionable).toEqual([...INSTRUCTOR_ACTIONABLE_COURSE_STATUSES].sort());
  });
});

describe("WORKFLOW_PHASES", () => {
  const allGroups = WORKFLOW_PHASES.flatMap((phase) =>
    phase.groups.map((group) => ({ phaseKey: phase.key, group })),
  );

  it("has exactly one group per course status, covering all statuses once", () => {
    const grouped = allGroups
      .flatMap(({ group }) => group.statuses)
      .sort();
    expect(grouped).toEqual([...COURSE_STATUSES].sort());
  });

  it("gives every group exactly one status", () => {
    for (const { group } of allGroups) {
      expect(group.statuses).toHaveLength(1);
    }
  });

  it("labels every group with its canonical status label", () => {
    for (const { group } of allGroups) {
      const status = group.statuses[0];
      expect(group.label).toBe(COURSE_STATUS_LABELS[status]);
    }
  });

  it("places every group under the status's pipeline phase", () => {
    for (const { phaseKey, group } of allGroups) {
      expect(phaseKey).toBe(getPipelineStage(group.statuses[0]));
    }
  });
});
