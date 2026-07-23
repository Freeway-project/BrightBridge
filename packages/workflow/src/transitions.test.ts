import { describe, expect, it } from "vitest";
import { canProvisionComplete, isAdminOverride } from "./transitions";
import type { CourseStatus } from "./statuses";
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

describe("canProvisionComplete", () => {
  it("allows super_admin and standard_user from staging_in_progress", () => {
    expect(canProvisionComplete("super_admin", "staging_in_progress")).toBe(true);
    expect(canProvisionComplete("standard_user", "staging_in_progress")).toBe(true);
  });

  it("rejects admin_full — the staging→final edge does not grant it", () => {
    expect(canProvisionComplete("admin_full", "staging_in_progress")).toBe(false);
  });

  it.each<Role>(["admin_viewer", "instructor", "provost"])(
    "rejects other role %s from staging_in_progress",
    (role) => {
      expect(canProvisionComplete(role, "staging_in_progress")).toBe(false);
    },
  );

  it.each<CourseStatus>([
    "course_created",
    "waiting_on_admin",
    "ready_for_instructor",
    "instructor_approved",
    "final_approved",
  ])("rejects status %s even for super_admin (only staging_in_progress is provisionable)", (from) => {
    expect(canProvisionComplete("super_admin", from)).toBe(false);
  });
});
