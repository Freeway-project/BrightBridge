export const ROLES = [
  "TA",
  "Admin",
  "Communication Department",
  "Instructor",
  "Super Admin"
] as const;

export type Role = (typeof ROLES)[number];

export const COURSE_STATUSES = [
  "Course Created",
  "Assigned to TA",
  "TA Review Started",
  "Submitted to Admin",
  "Admin Approved",
  "Sent to Instructor",
  "Final Approved"
] as const;

export type CourseStatus = (typeof COURSE_STATUSES)[number];
