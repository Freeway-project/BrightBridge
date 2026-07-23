import type { AssignmentRole, Role } from "./roles";
import type { CourseStatus } from "./statuses";

export type EffectiveRole = Role | AssignmentRole;

export type CourseTransition = {
  from: CourseStatus;
  to: CourseStatus;
  roles: readonly EffectiveRole[];
};

export type TransitionInput = {
  role: EffectiveRole;
  from: CourseStatus;
  to: CourseStatus;
};

export type AllowedTransitionsInput = {
  role: EffectiveRole;
  from: CourseStatus;
};

export const COURSE_TRANSITIONS = [
  {
    from: "course_created",
    to: "assigned_to_ta",
    roles: ["admin_full", "super_admin"]
  },
  {
    from: "assigned_to_ta",
    to: "ta_review_in_progress",
    roles: ["standard_user", "admin_full", "super_admin"]
  },
  {
    from: "ta_review_in_progress",
    to: "submitted_to_admin",
    roles: ["standard_user", "super_admin"]
  },
  {
    from: "submitted_to_admin",
    to: "admin_changes_requested",
    roles: ["admin_full", "super_admin"]
  },
  {
    from: "submitted_to_admin",
    to: "waiting_on_admin",
    roles: ["admin_full", "super_admin"]
  },
  {
    from: "admin_changes_requested",
    to: "ta_review_in_progress",
    roles: ["standard_user", "admin_full", "super_admin"]
  },
  {
    from: "waiting_on_admin",
    to: "staging_in_progress",
    roles: ["admin_full", "super_admin"]
  },
  {
    from: "staging_in_progress",
    to: "ready_for_instructor",
    roles: ["standard_user", "super_admin"]
  },
  {
    // "Provision Complete" — staff finish a course that needs no instructor
    // review, skipping the entire instructor phase. Mirrors the role set of the
    // ready_for_instructor branch above.
    from: "staging_in_progress",
    to: "final_approved",
    roles: ["standard_user", "super_admin"]
  },
  {
    from: "ready_for_instructor",
    to: "sent_to_instructor",
    roles: ["admin_full", "super_admin"]
  },
  {
    // Auto-advanced when the instructor opens their review link.
    from: "sent_to_instructor",
    to: "instructor_viewing",
    roles: ["instructor", "super_admin"]
  },
  {
    from: "sent_to_instructor",
    to: "instructor_questions",
    roles: ["instructor", "super_admin"]
  },
  {
    from: "sent_to_instructor",
    to: "instructor_approved",
    roles: ["instructor", "super_admin"]
  },
  {
    from: "instructor_viewing",
    to: "instructor_questions",
    roles: ["instructor", "super_admin"]
  },
  {
    from: "instructor_viewing",
    to: "instructor_approved",
    roles: ["instructor", "super_admin"]
  },
  {
    from: "instructor_questions",
    to: "sent_to_instructor",
    roles: ["admin_full", "super_admin"]
  },
  {
    from: "instructor_approved",
    to: "final_approved",
    roles: ["admin_full", "super_admin"]
  }
] as const satisfies readonly CourseTransition[];

export function canTransition({ role, from, to }: TransitionInput) {
  return COURSE_TRANSITIONS.some(
    (transition) =>
      transition.from === from &&
      transition.to === to &&
      transitionAllowsRole(transition, role)
  );
}

export function getAllowedTransitions({ role, from }: AllowedTransitionsInput) {
  return COURSE_TRANSITIONS.filter(
    (transition) => transition.from === from && transitionAllowsRole(transition, role)
  ).map((transition) => transition.to);
}

export function assertCanTransition(input: TransitionInput) {
  if (!canTransition(input)) {
    throw new Error(
      `Role "${input.role}" cannot transition course from "${input.from}" to "${input.to}".`
    );
  }
}

function transitionAllowsRole(transition: CourseTransition, role: EffectiveRole) {
  return (transition.roles as readonly EffectiveRole[]).includes(role);
}

/**
 * True when `role` may mark a course "provision complete" — the
 * `staging_in_progress → final_approved` transition. Only `staging_in_progress`
 * courses qualify; the role check is delegated to {@link canTransition}, so this
 * is the single source of truth shared by the courses board (button visibility
 * + eligible subset) and the bulk-provision server action.
 */
export function canProvisionComplete(role: EffectiveRole, from: CourseStatus): boolean {
  return (
    from === "staging_in_progress" &&
    canTransition({ role, from: "staging_in_progress", to: "final_approved" })
  );
}

const ADMIN_OVERRIDE_ROLES = ["admin_full", "super_admin"] as const satisfies readonly EffectiveRole[];

export function isAdminOverride({ role, from, to }: TransitionInput): boolean {
  if (from === to) return false;
  return (ADMIN_OVERRIDE_ROLES as readonly EffectiveRole[]).includes(role);
}
