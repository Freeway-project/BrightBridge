import { describe, expect, it } from "vitest";
import { buildHandoffLookup } from "../handoff-lookup";
import type { HandoffBucket } from "../handoff-buckets";

const course = (over: {
  id: string;
  daysSinceSent?: number | null;
  bucket?: HandoffBucket;
  opened?: boolean;
}) => ({
  daysSinceSent: 9,
  bucket: "overdue" as HandoffBucket,
  opened: false,
  ...over,
});

describe("buildHandoffLookup", () => {
  it("returns an empty record for null, undefined, and empty input", () => {
    expect(buildHandoffLookup(null)).toEqual({});
    expect(buildHandoffLookup(undefined)).toEqual({});
    expect(buildHandoffLookup([])).toEqual({});
  });

  it("keys entries by course id and keeps only staleness fields", () => {
    const lookup = buildHandoffLookup([
      course({ id: "c1", daysSinceSent: 9, bucket: "overdue", opened: false }),
      course({ id: "c2", daysSinceSent: 4, bucket: "aging", opened: true }),
    ]);
    expect(lookup["c1"]).toEqual({ daysSinceSent: 9, bucket: "overdue", opened: false });
    expect(lookup["c2"]).toEqual({ daysSinceSent: 4, bucket: "aging", opened: true });
  });

  it("preserves a null daysSinceSent (missing send event stays fresh)", () => {
    const lookup = buildHandoffLookup([
      course({ id: "c3", daysSinceSent: null, bucket: "fresh" }),
    ]);
    expect(lookup["c3"]).toEqual({ daysSinceSent: null, bucket: "fresh", opened: false });
  });

  it("misses courses the tracker excludes (e.g. instructor_approved)", () => {
    const lookup = buildHandoffLookup([course({ id: "c1" })]);
    expect(lookup["not-in-tracker"]).toBeUndefined();
  });
});
