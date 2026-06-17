import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import { mapAuditEventRow, toIsoTimestamp } from "../course-repository";

// node-postgres parses `timestamp`/`timestamptz` columns into JS `Date`
// objects. The `AuditEvent` contract (and downstream string consumers such as
// `parseISO`) expect ISO strings, so the data layer must coerce them.

describe("toIsoTimestamp", () => {
  it("converts a Date into an ISO-8601 string", () => {
    const date = new Date("2026-06-17T12:34:56.000Z");
    expect(toIsoTimestamp(date)).toBe("2026-06-17T12:34:56.000Z");
  });

  it("passes an existing ISO string through unchanged", () => {
    expect(toIsoTimestamp("2026-06-17T12:34:56.000Z")).toBe("2026-06-17T12:34:56.000Z");
  });
});

describe("mapAuditEventRow", () => {
  const baseRow = {
    id: "evt-1",
    from_status: "ta_review_in_progress",
    to_status: "ready_for_instructor",
    note: null,
    actor_role: "admin_full",
    course_id: "course-1",
    course_title: "Intro to Testing",
    actor_name: "Ada Admin",
    actor_email: "ada@example.com",
    on_behalf_of_name: null,
  };

  it("normalizes a Date created_at (pg default) into a string the view can parse", () => {
    // Reproduces the admin/stats crash: pg returns `created_at` as a Date, and
    // ActivityTrend calls parseISO() on it -> "e.split is not a function".
    const row = { ...baseRow, created_at: new Date("2026-06-17T12:34:56.000Z") };

    const event = mapAuditEventRow(row);

    expect(typeof event.created_at).toBe("string");
    // The view layer must be able to parse the result without throwing.
    expect(() => parseISO(event.created_at)).not.toThrow();
    expect(parseISO(event.created_at).getTime()).toBe(row.created_at.getTime());
  });

  it("preserves an already-string created_at", () => {
    const row = { ...baseRow, created_at: "2026-06-17T12:34:56.000Z" };
    expect(mapAuditEventRow(row).created_at).toBe("2026-06-17T12:34:56.000Z");
  });
});
