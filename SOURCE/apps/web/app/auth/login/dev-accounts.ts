export const DEV_ACCOUNTS = [
  { label: "Staff (TA)",       email: "ta@coursebridge.dev",               hint: "standard_user" },
  { label: "Admin",            email: "admin@coursebridge.dev",            hint: "admin_full" },
  { label: "Comms",            email: "communications@coursebridge.dev",   hint: "admin_viewer" },
  { label: "Instructor",       email: "instructor@coursebridge.dev",       hint: "instructor" },
  { label: "Admin+Instructor", email: "admin-instructor@coursebridge.dev", hint: "admin_full + also_instructor" },
  { label: "Super Admin",      email: "superadmin@coursebridge.dev",       hint: "super_admin" },
  { label: "Provost",          email: "provost@coursebridge.dev",          hint: "provost — all-access + org management" },
  { label: "Dean",             email: "dean@coursebridge.dev",             hint: "dean — drill-in (whole college)" },
  { label: "Associate Dean",   email: "associate-dean@coursebridge.dev",   hint: "associate_dean — school level" },
  { label: "Dept Head",        email: "depthead@coursebridge.dev",         hint: "dept_head — drill-in (Computer Science)" },
] as const;
