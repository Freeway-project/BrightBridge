export const COURSE_STATUSES = [
  "course_created",
  "assigned_to_ta",
  "ta_review_in_progress",
  "submitted_to_admin",
  "admin_changes_requested",
  "ready_for_instructor",
  "sent_to_instructor",
  "instructor_questions",
  "instructor_approved",
  "final_approved"
] as const;

export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  course_created: "Course Created",
  assigned_to_ta: "Assigned to TA",
  ta_review_in_progress: "TA Review In Progress",
  submitted_to_admin: "Submitted to Admin",
  admin_changes_requested: "Admin Changes Requested",
  ready_for_instructor: "Ready for Instructor",
  sent_to_instructor: "Sent to Instructor",
  instructor_questions: "Instructor Questions",
  instructor_approved: "Instructor Approved",
  final_approved: "Final Approved"
};

export function getCourseStatusLabel(status: CourseStatus) {
  return COURSE_STATUS_LABELS[status];
}

export function isFinalStatus(status: CourseStatus) {
  return status === "final_approved";
}

export function isInstructorVisibleStatus(status: CourseStatus) {
  return (
    status === "sent_to_instructor" ||
    status === "instructor_questions" ||
    status === "instructor_approved" ||
    status === "final_approved"
  );
}
