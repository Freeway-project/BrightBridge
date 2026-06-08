export const ROLES = [
  "super_admin",
  "admin_full",
  "admin_viewer",
  "standard_user",
  "instructor",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin_full: "Admin",
  admin_viewer: "Viewer",
  standard_user: "Staff",
  instructor: "Instructor",
};

export function getRoleLabel(role: Role) {
  return ROLE_LABELS[role];
}

// Layer 3 assignment roles
export const ASSIGNMENT_ROLES = ["staff", "instructor"] as const;
export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];
