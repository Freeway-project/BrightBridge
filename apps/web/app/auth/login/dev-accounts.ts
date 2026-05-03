export const DEV_ACCOUNTS = [
  { label: "Staff (TA)",       email: "ta@coursebridge.dev",               hint: "standard_user" },
  { label: "Admin",            email: "admin@coursebridge.dev",            hint: "admin_full" },
  { label: "Comms",            email: "communications@coursebridge.dev",   hint: "admin_viewer" },
  { label: "Instructor",       email: "instructor@coursebridge.dev",       hint: "instructor" },
  { label: "Admin+Instructor", email: "admin-instructor@coursebridge.dev", hint: "admin_full + is_instructor" },
  { label: "Super Admin",      email: "superadmin@coursebridge.dev",       hint: "super_admin" },
] as const;
