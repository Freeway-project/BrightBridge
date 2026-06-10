import { describe, expect, it } from "vitest";
import {
  COURSE_STATUSES,
  COURSE_STATUS_LABELS,
  COURSE_STATUS_SHORT_LABELS,
  type CourseStatus,
} from "./statuses";
import { getPhaseBreakdown } from "./phase-breakdown";

describe("getPhaseBreakdown", () => {
  it("returns the four pipeline phases in order", () => {
    const b = getPhaseBreakdown({});
    expect(b.map((p) => p.key)).toEqual(["migration", "staging", "instructor", "provision"]);
  });

  it("covers every course status exactly once, incl. instructor_viewing", () => {
    const b = getPhaseBreakdown({});
    const all = b.flatMap((p) => p.statuses.map((s) => s.status)).sort();
    expect(all).toEqual([...COURSE_STATUSES].sort());
    const instructor = b.find((p) => p.key === "instructor")!;
    expect(instructor.statuses.map((s) => s.status)).toContain("instructor_viewing");
  });

  it("computes per-phase totals as the sum of their statuses", () => {
    const counts: Partial<Record<CourseStatus, number>> = {
      course_created: 2, assigned_to_ta: 5, ta_review_in_progress: 8,
      instructor_viewing: 1, final_approved: 12,
    };
    const b = getPhaseBreakdown(counts);
    expect(b.find((p) => p.key === "migration")!.total).toBe(15);
    for (const p of b) {
      expect(p.total).toBe(p.statuses.reduce((sum, s) => sum + s.count, 0));
    }
  });

  it("grand total equals the sum of the input counts", () => {
    const counts: Partial<Record<CourseStatus, number>> = {
      course_created: 2, staging_in_progress: 4, instructor_viewing: 1, final_approved: 12,
    };
    const grand = getPhaseBreakdown(counts).reduce((sum, p) => sum + p.total, 0);
    expect(grand).toBe(19);
  });

  it("defaults missing statuses to 0 (never undefined/NaN)", () => {
    const b = getPhaseBreakdown({ course_created: 3 });
    for (const p of b) {
      for (const s of p.statuses) {
        expect(typeof s.count).toBe("number");
        expect(Number.isNaN(s.count)).toBe(false);
      }
    }
    const migration = b.find((p) => p.key === "migration")!;
    expect(migration.statuses.find((s) => s.status === "course_created")!.count).toBe(3);
    expect(migration.statuses.find((s) => s.status === "assigned_to_ta")!.count).toBe(0);
  });

  it("labels each status with canonical + short labels", () => {
    const b = getPhaseBreakdown({});
    for (const p of b) {
      for (const s of p.statuses) {
        expect(s.label).toBe(COURSE_STATUS_LABELS[s.status]);
        expect(s.shortLabel).toBe(COURSE_STATUS_SHORT_LABELS[s.status]);
      }
    }
    for (const status of COURSE_STATUSES) {
      expect(COURSE_STATUS_SHORT_LABELS[status]).toBeTruthy();
    }
  });
});
