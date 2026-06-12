"use server";

import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  assignUserToCourse,
  transitionCourseStatus,
  reassignCourseStaff,
} from "@/lib/courses/service";
import { requireAnyRole, requireProfile } from "@/lib/auth/context";
import { getAdminCoursesPage, getAdminCourseDetail } from "@/lib/admin/queries";
import { resolveEscalation } from "@/lib/services/escalations";
import { getCourseStatusLabel, type CourseStatus } from "@coursebridge/workflow";
import { syncCourseChannel } from "@/lib/chat/membership";

export type AssignTaState = {
  kind: "idle" | "success" | "error";
  message: string | null;
  results?: Array<{ courseId: string; title: string; success: boolean; message: string }>;
};

export type AssignableCourseOption = {
  id: string;
  title: string;
  sourceCourseId: string | null;
};

export async function searchAssignableCoursesAction(searchTerm: string): Promise<AssignableCourseOption[]> {
  const context = await requireProfile();
  requireAnyRole(context, ["admin_full", "super_admin"]);

  const normalized = searchTerm.trim();
  const page = await getAdminCoursesPage({
    page: 1,
    pageSize: 250,
    status: "course_created",
    search: normalized || undefined,
  });

  return page.data
    .filter((course) => course.ta === null)
    .map((course) => ({
      id: course.id,
      title: course.title,
      sourceCourseId: course.sourceCourseId,
    }));
}

export async function searchCoursesForInstructorAction(searchTerm: string): Promise<AssignableCourseOption[]> {
  const context = await requireProfile();
  requireAnyRole(context, ["admin_full", "super_admin"]);

  const normalized = searchTerm.trim();
  const page = await getAdminCoursesPage({
    page: 1,
    pageSize: 250,
    search: normalized || undefined,
  });

  // For instructors, we show all courses that match the search.
  // In a more refined version, we'd filter for courses missing an instructor.
  return page.data.map((course) => ({
    id: course.id,
    title: course.title,
    sourceCourseId: course.sourceCourseId,
  }));
}

export async function batchAssignTaAction(
  _state: AssignTaState,
  formData: FormData,
): Promise<AssignTaState> {
  const context = await requireProfile();
  requireAnyRole(context, ["admin_full", "super_admin"]);

  const profileId = String(formData.get("profileId") ?? "");
  const courseIds = String(formData.get("courseIds") ?? "").split(",").filter(Boolean);

  if (!profileId || courseIds.length === 0) {
    return {
      kind: "error",
      message: "Select both a staff member and at least one course.",
    };
  }

  const results: Array<{ courseId: string; title: string; success: boolean; message: string }> = [];
  let successCount = 0;

  for (const courseId of courseIds) {
    const detail = await getAdminCourseDetail(courseId);
    const title = detail?.course.title ?? "Unknown Course";

    try {
      if (!detail) throw new Error("Course not found.");

      await assignUserToCourse({
        courseId,
        profileId,
        role: "staff",
      });

      if (detail.course.status === "course_created") {
        await transitionCourseStatus({
          courseId,
          toStatus: "assigned_to_ta",
          note: "Staff assigned via batch action.",
        });
      }

      results.push({ courseId, title, success: true, message: "Assigned" });
      successCount++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Assignment failed";
      results.push({ courseId, title, success: false, message: msg });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/ta");
  courseIds.forEach(id => revalidatePath(`/courses/${id}`));

  for (const { courseId, success } of results) {
    if (success) {
      try { await syncCourseChannel(courseId); } catch (e) { console.error("syncCourseChannel failed:", e); }
    }
  }

  if (successCount === courseIds.length) {
    return {
      kind: "success",
      message: `Successfully assigned ${successCount} course(s).`,
      results,
    };
  }

  if (successCount === 0) {
    return {
      kind: "error",
      message: "All assignments failed.",
      results,
    };
  }

  return {
    kind: "success",
    message: `Assigned ${successCount} out of ${courseIds.length} courses. Some failed.`,
    results,
  };
}

export async function assignTaToCourseAction(
  _state: AssignTaState,
  formData: FormData,
): Promise<AssignTaState> {
  const context = await requireProfile();
  requireAnyRole(context, ["admin_full", "super_admin"]);

  const requestId = `assign-ta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const courseId = String(formData.get("courseId") ?? "");
  const profileId = String(formData.get("profileId") ?? "");

  if (!courseId || !profileId) {
    console.warn("[assignTaToCourseAction] Invalid payload", {
      requestId,
      courseIdPresent: Boolean(courseId),
      profileIdPresent: Boolean(profileId),
    });
    return {
      kind: "error",
      message: "Select both a course and a staff member.",
    };
  }

  console.info("[assignTaToCourseAction] Attempt started", {
    requestId,
    courseId,
    profileId,
  });

  const detail = await getAdminCourseDetail(courseId);

  if (!detail) {
    console.error("[assignTaToCourseAction] Course not found", {
      requestId,
      courseId,
      profileId,
    });
    return {
      kind: "error",
      message: "Course not found.",
    };
  }

  try {
    await assignUserToCourse({
      courseId,
      profileId,
      role: "staff",
    });

    if (detail.course.status === "course_created") {
      await transitionCourseStatus({
        courseId,
        toStatus: "assigned_to_ta",
        note: "Staff assigned by admin.",
      });
    }

    revalidatePath("/admin");
    revalidatePath("/ta");
    revalidatePath(`/courses/${courseId}`);

    try { await syncCourseChannel(courseId); } catch (e) { console.error("syncCourseChannel failed:", e); }

    console.info("[assignTaToCourseAction] Attempt succeeded", {
      requestId,
      courseId,
      profileId,
      priorStatus: detail.course.status,
    });

    return {
      kind: "success",
      message: "Staff member assigned to course.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not assign staff member.";

    const isAlreadyAssigned =
      message.includes("already assigned to a TA") ||
      message.includes("course_assignments_one_staff_per_course_idx") ||
      message.includes("duplicate key value violates unique constraint");

    Sentry.withScope((scope) => {
      scope.setTag("area", "admin_assignment");
      scope.setTag("action", "assign_ta_to_course");
      scope.setTag("request_id", requestId);
      scope.setTag("actor_role", context.profile.role);
      scope.setContext("assignment_attempt", {
        actorId: context.profile.id,
        actorEmail: context.profile.email,
        courseId,
        profileId,
        priorStatus: detail.course.status,
        isAlreadyAssigned,
      });
      scope.setLevel("error");
      Sentry.captureException(error instanceof Error ? error : new Error(message));
    });

    console.error("[assignTaToCourseAction] Attempt failed", {
      requestId,
      actorId: context.profile.id,
      actorEmail: context.profile.email,
      courseId,
      profileId,
      priorStatus: detail.course.status,
      error: message,
    });

    return {
      kind: "error",
      message: isAlreadyAssigned
        ? "This course was just assigned to another TA. Refresh and try again."
        : message,
    };
  }
}

export async function batchReassignCourseAction(
  _state: AssignTaState,
  formData: FormData,
): Promise<AssignTaState> {
  const context = await requireProfile();
  requireAnyRole(context, ["admin_full", "super_admin"]);

  const profileId = String(formData.get("profileId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const courseIds = String(formData.get("courseIds") ?? "").split(",").filter(Boolean);

  if (!profileId || courseIds.length === 0) {
    return { kind: "error", message: "Select both a new TA and at least one course." };
  }

  const results: Array<{ courseId: string; title: string; success: boolean; message: string }> = [];
  let successCount = 0;

  for (const courseId of courseIds) {
    const detail = await getAdminCourseDetail(courseId);
    const title = detail?.course.title ?? "Unknown Course";
    try {
      await reassignCourseStaff({ courseId, newProfileId: profileId, reason });
      results.push({ courseId, title, success: true, message: "Reassigned" });
      successCount++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Reassignment failed";
      results.push({ courseId, title, success: false, message: msg });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/ta");
  courseIds.forEach((id) => revalidatePath(`/courses/${id}`));

  for (const { courseId, success } of results) {
    if (success) {
      try { await syncCourseChannel(courseId); } catch (e) { console.error("syncCourseChannel failed:", e); }
    }
  }

  if (successCount === courseIds.length) {
    return { kind: "success", message: `Reassigned ${successCount} course(s).`, results };
  }
  if (successCount === 0) {
    return { kind: "error", message: "All reassignments failed.", results };
  }
  return {
    kind: "success",
    message: `Reassigned ${successCount} out of ${courseIds.length} courses. Some failed.`,
    results,
  };
}

export async function updateCourseDepartmentAction(courseId: string, orgUnitId: string | null): Promise<void> {
  const { updateCourseDepartment } = await import("@/lib/courses/service");
  await updateCourseDepartment(courseId, orgUnitId);
  revalidatePath("/admin");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function createInstructorAndAssignAction(
  _state: AssignTaState,
  formData: FormData,
): Promise<AssignTaState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const courseId = String(formData.get("courseId") ?? "");

  if (!email || !fullName || !courseId) {
    return {
      kind: "error",
      message: "Instructor name, email, and course selection are required.",
    };
  }

  const { getProfileRepository, getCourseRepository } = await import("@/lib/repositories");
  const { assignUserToCourse } = await import("@/lib/courses/service");
  const { randomUUID } = await import("node:crypto");

  try {
    const profiles = getProfileRepository();

    // Look up an existing instructor profile by email; create one if missing.
    const existing = await profiles.getProfileByEmail(email);
    const userId = existing?.id ?? randomUUID();

    await profiles.upsertProfile({
      id: userId,
      email,
      fullName,
      role: "instructor",
    });

    // 3. Assign to course
    await assignUserToCourse({
      courseId,
      profileId: userId,
      role: "instructor",
    });

    revalidatePath("/admin");
    revalidatePath(`/courses/${courseId}`);

    try { await syncCourseChannel(courseId); } catch (e) { console.error("syncCourseChannel failed:", e); }

    return {
      kind: "success",
      message: `Instructor ${fullName} created and assigned.`,
    };
  } catch (error) {
    console.error("[createInstructorAndAssignAction] Error:", error);
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Could not create/assign instructor.",
    };
  }
}

export async function approveReviewAction(courseId: string): Promise<void> {
  await transitionCourseStatus({
    courseId,
    toStatus: "waiting_on_admin",
    note: "Approved by admin — building staging shell.",
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/ta");
  revalidatePath(`/courses/${courseId}`);
  redirect("/admin");
}

export async function markStagingReadyAction(courseId: string): Promise<void> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "super_admin"]);
  await transitionCourseStatus({
    courseId,
    toStatus: "staging_in_progress",
    note: "Staging shell ready — pushed to TA to finalize.",
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/ta");
  revalidatePath(`/courses/${courseId}`);
}

export async function requestFixesAction(courseId: string, note: string): Promise<void> {
  await transitionCourseStatus({
    courseId,
    toStatus: "admin_changes_requested",
    note: note.trim() || "Admin requested fixes.",
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/courses/${courseId}`);
  redirect("/admin");
}

export async function resolveEscalationAction(escalationId: string, courseId: string, resolutionNote?: string): Promise<void> {
  const ctx = await requireProfile();
  await resolveEscalation(escalationId, ctx.userId, resolutionNote);

  revalidatePath("/admin");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function batchApproveToStagingAction(courseIds: string[]): Promise<{ succeeded: number; failed: number }> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "super_admin"]);

  let succeeded = 0;
  let failed = 0;
  for (const courseId of courseIds) {
    try {
      await transitionCourseStatus({ courseId, toStatus: "waiting_on_admin", note: "Batch approved to staging." });
      succeeded++;
    } catch {
      failed++;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/ta");
  return { succeeded, failed };
}

/**
 * Generates a fresh magic-link invite for every assigned instructor AND sends
 * the "course is ready" email through the logged instructor-emails service —
 * so every attempt shows up in the admin Emails tab regardless of outcome.
 *
 * Best-effort at the per-recipient level: a failure to one instructor is
 * logged + persisted (status='failed') but never throws, so it can't roll
 * back the surrounding status transition.
 */
async function emailInstructorInvites(courseId: string, createdBy: string): Promise<void> {
  try {
    const [{ createReviewInvite, getCourseInstructorRecipients }, { buildInviteLink }, { notifyInstructor }] = await Promise.all([
      import("@/lib/invites/service"),
      import("@/lib/email/templates/instructor-invite"),
      import("@/lib/instructor-emails/service"),
    ]);

    const detail = await getAdminCourseDetail(courseId);
    const courseTitle = detail?.course.title ?? "your migrated course";
    const recipients = await getCourseInstructorRecipients(courseId);

    for (const recipient of recipients) {
      try {
        const { token } = await createReviewInvite({
          courseId,
          email: recipient.email,
          createdBy,
        });
        await notifyInstructor({
          courseId,
          sentBy: createdBy,
          recipient: recipient.email,
          instructorName: recipient.fullName,
          courseTitle,
          dashboardUrl: buildInviteLink(token),
        });
      } catch (innerErr) {
        console.error(
          `[sendToInstructor] Failed to notify ${recipient.email} for course ${courseId}:`,
          innerErr,
        );
      }
    }
  } catch (error) {
    console.error(`[sendToInstructor] Failed to issue instructor invites for course ${courseId}:`, error);
  }
}

export async function sendToInstructorAction(courseId: string): Promise<void> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "admin_viewer", "super_admin"]);
  await transitionCourseStatus({
    courseId,
    toStatus: "sent_to_instructor",
    note: "Sent to instructor by communications.",
  });
  await emailInstructorInvites(courseId, ctx.userId);
  revalidatePath("/admin");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/communications");
  revalidatePath(`/communications/courses/${courseId}`);
  revalidatePath("/ta");
  revalidatePath("/instructor");
}

/**
 * Re-issues the instructor magic-link invite without changing course status.
 * Used by the "Resend invite" affordance once a course is already with the
 * instructor.
 */
export async function resendInstructorInviteAction(courseId: string): Promise<void> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "admin_viewer", "super_admin"]);

  // Resend is only allowed after a failed send. A successful prior send means
  // the instructor already has a working magic link; a still-pending send
  // shouldn't be duplicated. The Emails tab UI also hides the resend button
  // unless the last send failed, but the guard lives here too because the
  // action is exported.
  const { lastForCourse } = await import("@/lib/instructor-emails/queries");
  const last = await lastForCourse(courseId);
  if (!last) {
    throw new Error("No previous send to resend — use the initial send action.");
  }
  if (last.status !== "failed") {
    throw new Error(
      `Resend is only available after a failed send (last send: ${last.status}).`,
    );
  }

  await emailInstructorInvites(courseId, ctx.userId);
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/emails`);
}

export async function grantFinalApprovalAction(courseId: string): Promise<void> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "super_admin"]);
  await transitionCourseStatus({
    courseId,
    toStatus: "final_approved",
    note: "Final approval granted by admin.",
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/instructor");
}

/**
 * Generic click-to-advance used by the courses board. `transitionCourseStatus`
 * itself enforces the allowed-transition graph and the actor's role
 * (assertCanTransition) and course access (assertCanActOnCourse), so this is
 * safe for any (courseId, toStatus) — an illegal move throws and is reported.
 */
export async function transitionCourseAction(
  courseId: string,
  toStatus: CourseStatus,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "super_admin"]);
  try {
    await transitionCourseStatus({
      courseId,
      toStatus,
      note: `Moved to "${getCourseStatusLabel(toStatus)}" from the courses board.`,
    });
    revalidatePath("/admin");
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath("/ta");
    revalidatePath(`/courses/${courseId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not move the course.",
    };
  }
}
