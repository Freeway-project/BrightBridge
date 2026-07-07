import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock auth + repositories so the service's guard logic can be tested without a
// Next.js runtime or a real DB. (Names are `mock*`-prefixed so vitest allows
// them inside the hoisted vi.mock factories.)
const mockRequireProfile = vi.fn();
const mockRequireAnyRole = vi.fn();
const mockGetProfileById = vi.fn();
const mockSetCourseInstructor = vi.fn();

vi.mock("@/lib/auth/context", () => ({
  requireProfile: () => mockRequireProfile(),
  requireAnyRole: (...args: unknown[]) => mockRequireAnyRole(...args),
  getAuthContext: vi.fn(),
}));

vi.mock("@/lib/repositories", () => ({
  getProfileRepository: () => ({ getProfileById: mockGetProfileById }),
  getCourseRepository: () => ({ setCourseInstructor: mockSetCourseInstructor }),
  getReviewRepository: () => ({}),
  getHierarchyRepository: () => ({}),
}));

import { setCourseInstructor } from "../service";

const ADMIN_CTX = { profile: { id: "admin1", role: "admin_full" }, userId: "admin1" };

beforeEach(() => {
  mockRequireAnyRole.mockReset();
  mockRequireProfile.mockReset().mockResolvedValue(ADMIN_CTX);
  mockGetProfileById.mockReset();
  mockSetCourseInstructor.mockReset().mockResolvedValue(undefined);
});

describe("setCourseInstructor", () => {
  it("assigns an instructor, guarding on admin roles and passing actor + reason", async () => {
    mockGetProfileById.mockResolvedValue({ id: "inst1", email: "i@x.edu", fullName: "Ins", role: "instructor" });

    await setCourseInstructor({ courseId: "c1", newProfileId: "inst1", reason: "handoff" });

    expect(mockRequireAnyRole).toHaveBeenCalledWith(ADMIN_CTX, ["admin_full", "super_admin"]);
    expect(mockSetCourseInstructor).toHaveBeenCalledWith({
      courseId: "c1",
      newProfileId: "inst1",
      actorId: "admin1",
      reason: "handoff",
    });
  });

  it("defaults the reason to null when omitted", async () => {
    mockGetProfileById.mockResolvedValue({ id: "inst1", email: "i@x.edu", fullName: "Ins", role: "instructor" });

    await setCourseInstructor({ courseId: "c1", newProfileId: "inst1" });

    expect(mockSetCourseInstructor).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
  });

  it("rejects when the target profile does not exist", async () => {
    mockGetProfileById.mockResolvedValue(null);

    await expect(setCourseInstructor({ courseId: "c1", newProfileId: "nope" })).rejects.toThrow(/does not exist/);
    expect(mockSetCourseInstructor).not.toHaveBeenCalled();
  });

  it("rejects when the target profile is not an instructor", async () => {
    mockGetProfileById.mockResolvedValue({ id: "u1", email: "u@x.edu", fullName: "U", role: "standard_user" });

    await expect(setCourseInstructor({ courseId: "c1", newProfileId: "u1" })).rejects.toThrow(/instructor/);
    expect(mockSetCourseInstructor).not.toHaveBeenCalled();
  });
});
