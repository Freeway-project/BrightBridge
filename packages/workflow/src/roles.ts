export const ROLES = [
  "ta",
  "admin",
  "communications",
  "instructor",
  "super_admin"
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ta: "TA",
  admin: "Admin",
  communications: "Communications",
  instructor: "Instructor",
  super_admin: "Super Admin"
};

export function getRoleLabel(role: Role) {
  return ROLE_LABELS[role];
}
