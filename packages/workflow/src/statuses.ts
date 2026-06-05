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

/**
 * The statuses where the assigned instructor can still act on the course —
 * i.e. ask the TA a question or sign off. Once they have responded
 * (`instructor_questions` / `instructor_approved`) or the course has not yet
 * reached them, there is no instructor action to offer.
 */
export const INSTRUCTOR_ACTIONABLE_COURSE_STATUSES = [
  "sent_to_instructor",
  "instructor_viewing",
] as const satisfies readonly CourseStatus[];

export function isInstructorActionableStatus(status: CourseStatus): boolean {
  return (INSTRUCTOR_ACTIONABLE_COURSE_STATUSES as readonly CourseStatus[]).includes(status);
}

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

export type PipelineStage = "migration" | "staging" | "instructor" | "provision"

/**
 * Group keys now map 1:1 to a course status — each dashboard column holds
 * exactly one status, labelled with its canonical {@link COURSE_STATUS_LABELS}.
 */
export type StatusGroupKey = CourseStatus

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

/** One column = one status; label mirrors COURSE_STATUS_LABELS. */
function statusGroup(status: CourseStatus): WorkflowPhaseGroup {
  return { key: status, label: COURSE_STATUS_LABELS[status], statuses: [status] }
}

/**
 * Single source of truth for grouping the course statuses into the four
 * pipeline phases (Migration / Staging / Instructor / Provision). Each status
 * is its own column, labelled with its canonical status label, so the column
 * header, the card badge, and the backend status all read identically. Both
 * the staff course-list view and the admin board derive their columns from this.
 */
export const WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    key: "migration",
    label: "Migration",
    groups: (["course_created", "assigned_to_ta", "ta_review_in_progress"] as const satisfies readonly CourseStatus[]).map(statusGroup),
  },
  {
    key: "staging",
    label: "Staging",
    groups: ([
      "submitted_to_admin",
      "admin_changes_requested",
      "waiting_on_admin",
      "staging_in_progress",
      "ready_for_instructor",
    ] as const satisfies readonly CourseStatus[]).map(statusGroup),
  },
  {
    key: "instructor",
    label: "Instructor",
    groups: ([
      "sent_to_instructor",
      "instructor_viewing",
      "instructor_questions",
      "instructor_approved",
    ] as const satisfies readonly CourseStatus[]).map(statusGroup),
  },
  {
    key: "provision",
    label: "Provision",
    groups: (["final_approved"] as const satisfies readonly CourseStatus[]).map(statusGroup),
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
  if (
    status === "sent_to_instructor" ||
    status === "instructor_viewing" ||
    status === "instructor_questions" ||
    status === "instructor_approved"
  ) {
    return "instructor"
  }
  // submitted_to_admin, admin_changes_requested, waiting_on_admin,
  // staging_in_progress, ready_for_instructor
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
export type StaffAdvanceAction = "submit" | "finalize-staging" | "provision-complete";

export type StaffAdvance = {
  to: CourseStatus;
  action: StaffAdvanceAction;
  ctaLabel: string;
  requiresNote?: boolean;
};

/**
 * All staff "advance" options available for a status. Most statuses offer a
 * single action, but `staging_in_progress` is a fork: the staff member either
 * hands the course to the instructor, or marks it provision-complete (done,
 * skipping instructor review entirely). Returns an empty array for statuses
 * where staff cannot advance the course.
 */
export function getStaffAdvanceOptions(status: CourseStatus): StaffAdvance[] {
  switch (status) {
    case "assigned_to_ta":
    case "ta_review_in_progress":
      return [{ to: "submitted_to_admin", action: "submit", ctaLabel: "Submit to Admin" }];
    case "admin_changes_requested":
      return [
        {
          to: "submitted_to_admin",
          action: "submit",
          ctaLabel: "Resubmit to Admin",
          requiresNote: true,
        },
      ];
    case "staging_in_progress":
      return [
        {
          to: "ready_for_instructor",
          action: "finalize-staging",
          ctaLabel: "Mark Ready for Instructor",
        },
        {
          to: "final_approved",
          action: "provision-complete",
          ctaLabel: "Mark Provision Complete",
        },
      ];
    default:
      return [];
  }
}

/**
 * The primary staff advance for a status (the first of {@link getStaffAdvanceOptions}),
 * or null if there is none. Used for single-action surfaces like the course
 * card's "next action" label.
 */
export function getStaffAdvance(status: CourseStatus): StaffAdvance | null {
  return getStaffAdvanceOptions(status)[0] ?? null;
}
