import {
  isInstructorActionableStatus,
  type CourseStatus,
} from "@coursebridge/workflow";

/**
 * Derives what the Simple instructor view should offer for a given course
 * status + viewer. Presentation logic only — the actual gates live in the
 * workflow layer ({@link isInstructorActionableStatus}) and the server actions.
 *
 * - `canAsk` / `canApprove`: show the "ask a question" / "approve" steps.
 * - `statusMessage`: a plain-language line shown instead of an action when the
 *   instructor has already responded (or the course hasn't reached them yet).
 *   `null` means "no message — show the normal flow / read-only summary".
 */
export type InstructorSimpleState = {
  canAsk: boolean;
  canApprove: boolean;
  statusMessage: string | null;
};

export function getInstructorSimpleState(
  status: CourseStatus,
  readOnly: boolean,
): InstructorSimpleState {
  // Department / leadership / super-admin viewers can look but not act.
  if (readOnly) {
    return { canAsk: false, canApprove: false, statusMessage: null };
  }

  if (isInstructorActionableStatus(status)) {
    return { canAsk: true, canApprove: true, statusMessage: null };
  }

  const statusMessage =
    status === "instructor_questions"
      ? "You've sent a question — we'll let you know when the team replies."
      : status === "instructor_approved" || status === "final_approved"
        ? "You've approved this course. Thank you — there's nothing more to do."
        : "This course isn't ready for your review just yet.";

  return { canAsk: false, canApprove: false, statusMessage };
}
