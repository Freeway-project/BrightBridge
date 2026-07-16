import { describe, expect, it, vi, beforeEach } from "vitest";

const mockResolveScope = vi.fn();
const mockListInbox = vi.fn();
const mockIsAccessible = vi.fn();

vi.mock("@/lib/courses/service", () => ({
  resolveAccessibleScope: (...args: unknown[]) => mockResolveScope(...args),
}));
vi.mock("@/lib/repositories", () => ({
  getCourseChatRepository: () => ({
    listCourseChatInbox: mockListInbox,
    isCourseAccessible: mockIsAccessible,
  }),
}));
vi.mock("server-only", () => ({}));

import { getCourseChatInbox, canAccessCourseChat } from "../course-chat";

beforeEach(() => {
  mockResolveScope.mockReset();
  mockListInbox.mockReset();
  mockIsAccessible.mockReset();
});

describe("getCourseChatInbox", () => {
  it("passes the resolved scope to the repository and returns its result", async () => {
    mockResolveScope.mockResolvedValueOnce({ scope: { kind: "all" }, canExport: true });
    mockListInbox.mockResolvedValueOnce([{ courseId: "c1" }]);
    const result = await getCourseChatInbox();
    expect(mockListInbox).toHaveBeenCalledWith({ kind: "all" });
    expect(result).toEqual([{ courseId: "c1" }]);
  });

  it("returns [] when there is no scope (anonymous / missing profile)", async () => {
    mockResolveScope.mockResolvedValueOnce({ scope: null, canExport: false });
    expect(await getCourseChatInbox()).toEqual([]);
    expect(mockListInbox).not.toHaveBeenCalled();
  });
});

describe("canAccessCourseChat", () => {
  it("delegates to repo.isCourseAccessible with scope + courseId", async () => {
    mockResolveScope.mockResolvedValueOnce({
      scope: { kind: "assigned", profileId: "p1", role: "instructor" },
      canExport: false,
    });
    mockIsAccessible.mockResolvedValueOnce(true);
    expect(await canAccessCourseChat("c1")).toBe(true);
    expect(mockIsAccessible).toHaveBeenCalledWith(
      { kind: "assigned", profileId: "p1", role: "instructor" },
      "c1",
    );
  });

  it("returns false when there is no scope", async () => {
    mockResolveScope.mockResolvedValueOnce({ scope: null, canExport: false });
    expect(await canAccessCourseChat("c1")).toBe(false);
    expect(mockIsAccessible).not.toHaveBeenCalled();
  });
});
