import { describe, expect, it } from "vitest";
import {
  bucketForDays,
  daysSince,
  summarize,
  type HandoffClassification,
} from "../handoff-buckets";

const NOW = new Date("2026-07-15T12:00:00Z").getTime();
const daysAgoIso = (days: number) =>
  new Date(NOW - days * 86_400_000).toISOString();

describe("daysSince", () => {
  it("returns whole days between an ISO timestamp and now", () => {
    expect(daysSince(daysAgoIso(7), NOW)).toBe(7);
    expect(daysSince(daysAgoIso(0), NOW)).toBe(0);
  });

  it("floors partial days", () => {
    // 7.9 days ago still counts as 7 whole days
    expect(daysSince(new Date(NOW - 7.9 * 86_400_000).toISOString(), NOW)).toBe(7);
  });

  it("returns null for missing or unparseable timestamps", () => {
    expect(daysSince(null, NOW)).toBeNull();
    expect(daysSince(undefined, NOW)).toBeNull();
    expect(daysSince("not-a-date", NOW)).toBeNull();
  });
});

describe("bucketForDays", () => {
  it("classifies by threshold boundaries (aging=3, overdue=7)", () => {
    expect(bucketForDays(0)).toBe("fresh");
    expect(bucketForDays(2)).toBe("fresh"); // just under aging
    expect(bucketForDays(3)).toBe("aging"); // aging boundary
    expect(bucketForDays(6)).toBe("aging"); // just under overdue
    expect(bucketForDays(7)).toBe("overdue"); // overdue boundary — the "7 days" red rule
    expect(bucketForDays(30)).toBe("overdue");
  });

  it("treats a missing send date as fresh (no false alarm)", () => {
    expect(bucketForDays(null)).toBe("fresh");
  });
});

describe("summarize", () => {
  const c = (over: Partial<HandoffClassification>): HandoffClassification => ({
    bucket: "fresh",
    daysSinceSent: 0,
    opened: true,
    hasQuestions: false,
    ...over,
  });

  it("returns all zeros / nulls for an empty list", () => {
    expect(summarize([])).toEqual({
      total: 0,
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
    });
  });

  it("counts buckets, engagement, and the urgent overdue-unopened slice", () => {
    const items = [
      c({ bucket: "fresh", daysSinceSent: 1, opened: true }),
      c({ bucket: "aging", daysSinceSent: 4, opened: false }), // never opened
      c({ bucket: "overdue", daysSinceSent: 8, opened: false, hasQuestions: false }), // urgent
      c({ bucket: "overdue", daysSinceSent: 10, opened: true, hasQuestions: true }), // opened + questions
    ];
    expect(summarize(items)).toEqual({
      total: 4,
      fresh: 1,
      aging: 1,
      overdue: 2,
      opened: 2,
      neverOpened: 2,
      hasQuestions: 1,
      overdueUnopened: 1,
      openRate: 50, // 2 of 4 opened
      avgDaysSinceSent: 6, // round((1+4+8+10)/4) = round(5.75)
      oldestDaysSinceSent: 10,
    });
  });

  it("ignores null send dates in timing stats", () => {
    const items = [
      c({ bucket: "fresh", daysSinceSent: null, opened: false }),
      c({ bucket: "overdue", daysSinceSent: 9, opened: true }),
    ];
    const s = summarize(items);
    expect(s.avgDaysSinceSent).toBe(9); // only the one with a known date
    expect(s.oldestDaysSinceSent).toBe(9);
    expect(s.openRate).toBe(50);
  });
});
