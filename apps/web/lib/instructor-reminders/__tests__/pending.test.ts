import { describe, expect, it } from "vitest";
import type { InstructorPendingCourse } from "@/lib/repositories/contracts";
import { classifyPendingCourses, overdueUnvisited } from "../pending";

const NOW = new Date("2026-07-15T12:00:00Z").getTime();
const daysAgoIso = (days: number) =>
  new Date(NOW - days * 86_400_000).toISOString();

const course = (over: Partial<InstructorPendingCourse>): InstructorPendingCourse => ({
  id: "c1",
  title: "Course",
  term: null,
  department: null,
  status: "sent_to_instructor",
  sentAt: daysAgoIso(1),
  firstOpenedAt: null,
  ...over,
});

describe("classifyPendingCourses", () => {
  it("derives days, bucket, and visited from sentAt / firstOpenedAt", () => {
    const [classified] = classifyPendingCourses(
      [course({ sentAt: daysAgoIso(8), firstOpenedAt: daysAgoIso(2) })],
      NOW,
    );
    expect(classified.daysSinceSent).toBe(8);
    expect(classified.bucket).toBe("overdue");
    expect(classified.visited).toBe(true);
  });

  it("treats a missing send event as fresh and unvisited stays false", () => {
    const [classified] = classifyPendingCourses(
      [course({ sentAt: null, firstOpenedAt: null })],
      NOW,
    );
    expect(classified.daysSinceSent).toBeNull();
    expect(classified.bucket).toBe("fresh");
    expect(classified.visited).toBe(false);
  });

  it("sorts most pending first: oldest sent on top, missing send date last", () => {
    const sorted = classifyPendingCourses(
      [
        course({ id: "fresh", sentAt: daysAgoIso(1) }),
        course({ id: "no-send-event", sentAt: null }),
        course({ id: "overdue", sentAt: daysAgoIso(10) }),
        course({ id: "aging", sentAt: daysAgoIso(4) }),
      ],
      NOW,
    );
    expect(sorted.map((c) => c.id)).toEqual([
      "overdue",
      "aging",
      "fresh",
      "no-send-event",
    ]);
  });

  it("breaks day ties by never-opened first, then title", () => {
    const sorted = classifyPendingCourses(
      [
        course({ id: "b-unvisited", title: "Beta", sentAt: daysAgoIso(5), firstOpenedAt: null }),
        course({ id: "visited", title: "Alpha", sentAt: daysAgoIso(5), firstOpenedAt: daysAgoIso(1) }),
        course({ id: "a-unvisited", title: "Astro", sentAt: daysAgoIso(5), firstOpenedAt: null }),
      ],
      NOW,
    );
    expect(sorted.map((c) => c.id)).toEqual(["a-unvisited", "b-unvisited", "visited"]);
  });
});

describe("overdueUnvisited", () => {
  it("keeps only courses that are overdue AND never opened", () => {
    const classified = classifyPendingCourses(
      [
        course({ id: "overdue-unvisited", sentAt: daysAgoIso(9), firstOpenedAt: null }),
        course({ id: "overdue-visited", sentAt: daysAgoIso(9), firstOpenedAt: daysAgoIso(3) }),
        course({ id: "aging-unvisited", sentAt: daysAgoIso(4), firstOpenedAt: null }),
        course({ id: "boundary-overdue", sentAt: daysAgoIso(7), firstOpenedAt: null }),
      ],
      NOW,
    );
    expect(overdueUnvisited(classified).map((c) => c.id)).toEqual([
      "overdue-unvisited",
      "boundary-overdue",
    ]);
  });

  it("returns empty for an empty list", () => {
    expect(overdueUnvisited([])).toEqual([]);
  });
});
