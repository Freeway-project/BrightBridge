import { describe, expect, it, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("@/lib/postgres/pool", () => ({
  getPostgresPool: () => ({ query: mockQuery }),
}));

import { createPostgresCourseChatRepository } from "../course-chat-repository";

beforeEach(() => mockQuery.mockReset());

describe("listCourseChatInbox", () => {
  it("aggregates unanswered count + last activity and maps rows (Date -> ISO)", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          course_id: "c1",
          course_title: "Bio 101",
          last_activity_at: new Date("2026-07-10T00:00:00Z"),
          unanswered_count: 2,
          last_preview: "when is the exam?",
          last_author_name: "Jane Doe",
        },
      ],
    });
    const repo = createPostgresCourseChatRepository();
    const result = await repo.listCourseChatInbox({ kind: "all" });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/GROUP BY course_id/);
    expect(sql).toMatch(/FILTER \(WHERE is_question AND NOT is_answered\)/);
    expect(sql).toMatch(/visibility = 'instructor_visible'/);
    expect(sql).toMatch(/ORDER BY agg\.last_activity_at DESC/);
    expect(params).toEqual([]);
    expect(result).toEqual([
      {
        courseId: "c1",
        courseTitle: "Bio 101",
        lastActivityAt: "2026-07-10T00:00:00.000Z",
        lastPreview: "when is the exam?",
        lastAuthorName: "Jane Doe",
        unansweredCount: 2,
      },
    ]);
  });

  it("adds an assignment EXISTS predicate + params for scoped roles", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const repo = createPostgresCourseChatRepository();
    await repo.listCourseChatInbox({ kind: "assigned", profileId: "p1", role: "instructor" });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(
      /EXISTS \(SELECT 1 FROM course_assignments ca WHERE ca\.course_id = c\.id AND ca\.profile_id = \$1 AND ca\.role = \$2\)/,
    );
    expect(params).toEqual(["p1", "instructor"]);
  });

  it("omits the assignment predicate for kind:all", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const repo = createPostgresCourseChatRepository();
    await repo.listCourseChatInbox({ kind: "all" });
    expect(mockQuery.mock.calls[0][0]).not.toMatch(/course_assignments/);
  });
});

describe("isCourseAccessible", () => {
  it("returns true when a row is returned (kind:all -> id only)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ok: true }] });
    const repo = createPostgresCourseChatRepository();
    const ok = await repo.isCourseAccessible({ kind: "all" }, "c1");
    expect(ok).toBe(true);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/FROM courses c WHERE c\.id = \$1/);
    expect(params).toEqual(["c1"]);
  });

  it("returns false with an assignment predicate for scoped roles", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const repo = createPostgresCourseChatRepository();
    const ok = await repo.isCourseAccessible(
      { kind: "assigned", profileId: "p1", role: "staff" },
      "c1",
    );
    expect(ok).toBe(false);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(
      /course_assignments ca WHERE ca\.course_id = c\.id AND ca\.profile_id = \$2 AND ca\.role = \$3/,
    );
    expect(params).toEqual(["c1", "p1", "staff"]);
  });
});
