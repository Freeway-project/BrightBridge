export const COURSE_STATUSES = [
  "course_created",
  "assigned_to_ta",
  "ta_review_in_progress",
  "submitted_to_admin",
  "admin_changes_requested",
  "waiting_on_admin",
  "staging_in_progress",
  "ready_for_instructor",
  "sent_to_instructor",
  "instructor_viewing",
  "instructor_questions",
  "instructor_approved",
  "final_approved"
] as const;

export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const STAFF_ACTIONABLE_COURSE_STATUSES = [
  "assigned_to_ta",
  "ta_review_in_progress",
  "admin_changes_requested",
  "staging_in_progress",
] as const satisfies readonly CourseStatus[];

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  course_created: "Course Created",
  assigned_to_ta: "Assigned to TA",
  ta_review_in_progress: "TA Review In Progress",
  submitted_to_admin: "Submitted to Admin",
  admin_changes_requested: "Admin Changes Requested",
  waiting_on_admin: "Waiting on Admin",
  staging_in_progress: "Staging in Process",
  ready_for_instructor: "Ready for Instructor",
  sent_to_instructor: "Sent to Instructor",
  instructor_viewing: "Instructor Viewing",
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
    status === "instructor_viewing" ||
    status === "instructor_questions" ||
    status === "instructor_approved" ||
    status === "final_approved"
  );
}

export type PipelineStage = "migration" | "staging" | "provision"

/**
 * Sub-group keys used to bucket statuses within a pipeline phase for the
 * dashboard tab/column UIs. See {@link WORKFLOW_PHASES}.
 */
export type StatusGroupKey =
  | "todo"
  | "in_review"
  | "admin_review"
  | "shell_build"
  | "ready_to_send"
  | "with_instructor"
  | "final"

export type WorkflowPhaseGroup = {
  key: StatusGroupKey
  label: string
  statuses: CourseStatus[]
}

export type WorkflowPhase = {
  key: PipelineStage
  label: string
  groups: WorkflowPhaseGroup[]
}

/**
 * Single source of truth for grouping the 12 course statuses into the three
 * pipeline phases (Migration / Staging / Provision) and their sub-groups.
 * Both the TA course-list view and the admin board derive their tabs/columns
 * from this — labels mirror {@link COURSE_STATUS_LABELS}. Every status appears
 * in exactly one group.
 */
export const WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    key: "migration",
    label: "Migration",
    groups: [
      { key: "todo", label: "To Do", statuses: ["course_created", "assigned_to_ta"] },
      { key: "in_review", label: "In Review", statuses: ["ta_review_in_progress"] },
    ],
  },
  {
    key: "staging",
    label: "Staging",
    groups: [
      { key: "admin_review", label: "Admin Review", statuses: ["submitted_to_admin", "admin_changes_requested"] },
      { key: "shell_build", label: "Shell Build", statuses: ["waiting_on_admin", "staging_in_progress"] },
      { key: "ready_to_send", label: "Ready to Send", statuses: ["ready_for_instructor"] },
      { key: "with_instructor", label: "With Instructor", statuses: ["sent_to_instructor", "instructor_viewing", "instructor_questions", "instructor_approved"] },
    ],
  },
  {
    key: "provision",
    label: "Provision",
    groups: [
      { key: "final", label: "Final Approved", statuses: ["final_approved"] },
    ],
  },
]

export function getPipelineStage(status: CourseStatus): PipelineStage {
  if (status === "final_approved") return "provision"
  if (
    status === "course_created" ||
    status === "assigned_to_ta" ||
    status === "ta_review_in_progress"
  ) {
    return "migration"
  }
  // submitted_to_admin, admin_changes_requested, waiting_on_admin,
  // staging_in_progress, ready_for_instructor, sent_to_instructor,
  // instructor_viewing, instructor_questions, instructor_approved
  return "staging"
}

/**
 * Whose court the case is in for a given status. The UI renders this relative
 * to the viewer (owner === me → "Your turn", else "Waiting on …").
 */
export type BallInCourt = "staff" | "admin" | "instructor" | "done";

const BALL_IN_COURT: Record<CourseStatus, BallInCourt> = {
  course_created: "admin",
  assigned_to_ta: "staff",
  ta_review_in_progress: "staff",
  submitted_to_admin: "admin",
  admin_changes_requested: "staff",
  waiting_on_admin: "admin",
  staging_in_progress: "staff",
  ready_for_instructor: "admin",
  sent_to_instructor: "instructor",
  instructor_viewing: "instructor",
  instructor_questions: "instructor",
  instructor_approved: "admin",
  final_approved: "done",
};

export function getBallInCourt(status: CourseStatus): BallInCourt {
  return BALL_IN_COURT[status];
}

/**
 * The single descriptor for the staff "advance to next step" action. Returns
 * null for any status where staff cannot advance the course. The non-null
 * domain is asserted (in tests) to equal STAFF_ACTIONABLE_COURSE_STATUSES.
 */
export type StaffAdvance = {
  to: CourseStatus;
  action: "submit" | "finalize-staging";
  ctaLabel: string;
  requiresNote?: boolean;
};

export function getStaffAdvance(status: CourseStatus): StaffAdvance | null {
  switch (status) {
    case "assigned_to_ta":
    case "ta_review_in_progress":
      return { to: "submitted_to_admin", action: "submit", ctaLabel: "Submit to Admin" };
    case "admin_changes_requested":
      return {
        to: "submitted_to_admin",
        action: "submit",
        ctaLabel: "Resubmit to Admin",
        requiresNote: true,
      };
    case "staging_in_progress":
      return {
        to: "ready_for_instructor",
        action: "finalize-staging",
        ctaLabel: "Mark Ready for Instructor",
      };
    default:
      return null;
  }
}
