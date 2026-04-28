import type { Role } from "./roles";
import type { CourseStatus } from "./statuses";

export type CourseTransition = {
  from: CourseStatus;
  to: CourseStatus;
  roles: readonly Role[];
};

export type TransitionInput = {
  role: Role;
  from: CourseStatus;
  to: CourseStatus;
};

export type AllowedTransitionsInput = {
  role: Role;
  from: CourseStatus;
};

export const COURSE_TRANSITIONS = [
  {
    from: "course_created",
    to: "assigned_to_ta",
    roles: ["admin", "super_admin"]
  },
  {
    from: "assigned_to_ta",
    to: "ta_review_in_progress",
    roles: ["ta", "admin", "super_admin"]
  },
  {
    from: "ta_review_in_progress",
    to: "submitted_to_admin",
    roles: ["ta", "super_admin"]
  },
  {
    from: "submitted_to_admin",
    to: "admin_changes_requested",
    roles: ["admin", "super_admin"]
  },
  {
    from: "submitted_to_admin",
    to: "ready_for_instructor",
    roles: ["admin", "super_admin"]
  },
  {
    from: "admin_changes_requested",
    to: "ta_review_in_progress",
    roles: ["ta", "admin", "super_admin"]
  },
  {
    from: "ready_for_instructor",
    to: "sent_to_instructor",
    roles: ["communications", "admin", "super_admin"]
  },
  {
    from: "sent_to_instructor",
    to: "instructor_questions",
    roles: ["instructor", "super_admin"]
  },
  {
    from: "instructor_questions",
    to: "sent_to_instructor",
    roles: ["communications", "admin", "super_admin"]
  },
  {
    from: "sent_to_instructor",
    to: "instructor_approved",
    roles: ["instructor", "super_admin"]
  },
  {
    from: "instructor_approved",
    to: "final_approved",
    roles: ["admin", "super_admin"]
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

function transitionAllowsRole(transition: CourseTransition, role: Role) {
  return transition.roles.includes(role);
}
