import { describe, expect, it } from "vitest";
import { isAdminOverride } from "./transitions";
import type { Role } from "./roles";

describe("isAdminOverride", () => {
  it("allows admin_full to jump between any two distinct statuses", () => {
    expect(isAdminOverride({ role: "admin_full", from: "final_approved", to: "ta_review_in_progress" })).toBe(true);
    expect(isAdminOverride({ role: "admin_full", from: "course_created", to: "final_approved" })).toBe(true);
  });

  it("allows super_admin to jump between any two distinct statuses", () => {
    expect(isAdminOverride({ role: "super_admin", from: "submitted_to_admin", to: "course_created" })).toBe(true);
  });

  it("rejects identical from/to", () => {
    expect(isAdminOverride({ role: "admin_full", from: "submitted_to_admin", to: "submitted_to_admin" })).toBe(false);
  });

  it.each<Role>(["admin_viewer", "standard_user", "instructor", "provost"])(
    "rejects non-admin role %s",
    (role) => {
      expect(isAdminOverride({ role, from: "submitted_to_admin", to: "waiting_on_admin" })).toBe(false);
    },
  );
});
