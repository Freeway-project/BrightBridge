import { describe, expect, it, vi, beforeEach } from "vitest";
import { overrideCourseStatus } from "./course-status-override";

// Mock the postgres pool so the service never needs a real DB connection.
const mockQuery = vi.fn();
vi.mock("@/lib/postgres/pool", () => ({
  getPostgresPool: () => ({ query: mockQuery }),
}));

// Suppress the server-only guard in test context.
vi.mock("server-only", () => ({}));

const BASE_INPUT = {
  courseId: "c1",
  to: "ta_review_in_progress" as const,
  reason: "Reverting to fix metadata",
  actorId: "u1",
  actorRole: "admin_full" as const,
};

function setupPool(opts: { status?: string; insertError?: Error; updateError?: Error } = {}) {
  mockQuery.mockReset();
  // Call 1: SELECT status FROM courses
  mockQuery.mockResolvedValueOnce({ rows: [{ status: opts.status ?? "submitted_to_admin" }] });
  // Call 2: INSERT INTO course_status_events
  if (opts.insertError) {
    mockQuery.mockRejectedValueOnce(opts.insertError);
  } else {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
  }
  // Call 3: UPDATE courses SET status
  if (opts.updateError) {
    mockQuery.mockRejectedValueOnce(opts.updateError);
  } else {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
  }
}

beforeEach(() => mockQuery.mockReset());

describe("overrideCourseStatus", () => {
  it("inserts an admin_override event and updates courses.status", async () => {
    setupPool();
    await overrideCourseStatus(BASE_INPUT);

    expect(mockQuery).toHaveBeenCalledTimes(3);
    // Second call is the INSERT
    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[0]).toMatch(/INSERT INTO course_status_events/);
    expect(insertCall[1]).toEqual(["c1", "submitted_to_admin", "ta_review_in_progress", "u1", "admin_full", "Reverting to fix metadata"]);
    // Third call is the UPDATE
    const updateCall = mockQuery.mock.calls[2];
    expect(updateCall[0]).toMatch(/UPDATE courses SET status/);
    expect(updateCall[1]).toEqual(["ta_review_in_progress", "c1"]);
  });

  it("rejects when target equals current status", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: "submitted_to_admin" }] });
    await expect(
      overrideCourseStatus({ ...BASE_INPUT, to: "submitted_to_admin" }),
    ).rejects.toThrow(/already/i);
  });

  it("rejects when reason is shorter than 10 chars after trim", async () => {
    await expect(
      overrideCourseStatus({ ...BASE_INPUT, reason: "   short   " }),
    ).rejects.toThrow(/reason/i);
  });

  it("rejects when actor role is not allowed", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: "submitted_to_admin" }] });
    await expect(
      overrideCourseStatus({ ...BASE_INPUT, actorRole: "admin_viewer" as never }),
    ).rejects.toThrow(/forbidden/i);
  });

  it("throws when reading the course returns no rows", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(overrideCourseStatus(BASE_INPUT)).rejects.toThrow(/not found/);
  });

  it("throws when the SELECT query rejects", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db read fail"));
    await expect(overrideCourseStatus(BASE_INPUT)).rejects.toThrow(/db read fail/);
  });

  it("propagates the insert error", async () => {
    setupPool({ insertError: new Error("insert boom") });
    await expect(overrideCourseStatus(BASE_INPUT)).rejects.toThrow(/insert boom/);
  });

  it("propagates the update error", async () => {
    setupPool({ updateError: new Error("update boom") });
    await expect(overrideCourseStatus(BASE_INPUT)).rejects.toThrow(/update boom/);
  });
});
