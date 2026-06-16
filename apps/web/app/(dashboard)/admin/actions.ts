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

export type BatchMailMergeRow = {
  instructorName: string;
  instructorEmail: string;
  courseTitle: string;
  moodleUrl: string;
  brightspaceUrl: string;
  magicLink: string;
};

export type BatchExportResult = {
  rows: BatchMailMergeRow[];
  skipped: number;
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

type InstructorMailMergeRow = {
  instructorName: string;
  instructorEmail: string;
  courseTitle: string;
  inviteLink: string;
  expiresAt: string;
};

/**
 * Generates fresh invite links for every assigned instructor and returns the
 * rows needed for a manual mail-merge CSV export. Creating a new export always
 * revokes any prior unaccepted links for the same course+recipient.
 */
async function createInstructorMailMergeRows(
  courseId: string,
  createdBy: string,
): Promise<InstructorMailMergeRow[]> {
  const [{ createReviewInvite, getCourseInstructorRecipients }, { buildInviteLink }] = await Promise.all([
    import("@/lib/invites/service"),
    import("@/lib/email/templates/instructor-invite"),
  ]);

  const detail = await getAdminCourseDetail(courseId);
  const courseTitle = detail?.course.title ?? "your migrated course";
  const recipients = await getCourseInstructorRecipients(courseId);

  const rows: InstructorMailMergeRow[] = [];
  for (const recipient of recipients) {
    const { token, invite } = await createReviewInvite({
      courseId,
      email: recipient.email,
      createdBy,
    });

    rows.push({
      instructorName: recipient.fullName ?? "",
      instructorEmail: recipient.email,
      courseTitle,
      inviteLink: buildInviteLink(token),
      expiresAt: invite.expiresAt,
    });
  }

  return rows;
}

export async function sendToInstructorAction(courseId: string): Promise<InstructorMailMergeRow[]> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "admin_viewer", "super_admin"]);
  await transitionCourseStatus({
    courseId,
    toStatus: "sent_to_instructor",
    note: "Sent to instructor by communications.",
  });
  const rows = await createInstructorMailMergeRows(courseId, ctx.userId);
  revalidatePath("/admin");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/communications");
  revalidatePath(`/communications/courses/${courseId}`);
  revalidatePath("/ta");
  revalidatePath("/instructor");
  return rows;
}

/**
 * Generates a fresh CSV payload for manual mail merge without changing course
 * status. Issuing a new export revokes any prior unaccepted links for the same
 * recipients, so only the latest CSV should be used.
 */
export async function resendInstructorInviteAction(courseId: string): Promise<InstructorMailMergeRow[]> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "admin_viewer", "super_admin"]);

  const rows = await createInstructorMailMergeRows(courseId, ctx.userId);
  revalidatePath(`/admin/courses/${courseId}`);
  return rows;
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

/**
 * For each selected course: mints a never-expiring magic link for the assigned
 * instructor, transitions the course to sent_to_instructor, and returns a row
 * for the mail-merge CSV. Courses that fail (no instructor, transition error)
 * are skipped and counted in the returned skipped total.
 */
export async function batchExportAndSendAction(courseIds: string[]): Promise<BatchExportResult> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "super_admin"]);

  const { getReadyForInstructorCourses } = await import("@/lib/admin/queries");
  const { createReviewInvite } = await import("@/lib/invites/service");
  const { buildInviteLink } = await import("@/lib/email/templates/instructor-invite");

  const allReady = await getReadyForInstructorCourses();
  const readyById = new Map(allReady.map((c) => [c.courseId, c]));

  const rows: BatchMailMergeRow[] = [];
  let skipped = 0;

  for (const courseId of courseIds) {
    const course = readyById.get(courseId);
    if (!course) {
      skipped++;
      continue;
    }

    try {
      const { token } = await createReviewInvite({
        courseId,
        email: course.instructorEmail,
        createdBy: ctx.userId,
        neverExpires: true,
      });

      await transitionCourseStatus({
        courseId,
        toStatus: "sent_to_instructor",
        note: "Sent to instructor via batch export.",
      });

      rows.push({
        instructorName: course.instructorName ?? "",
        instructorEmail: course.instructorEmail,
        courseTitle: course.courseTitle,
        moodleUrl: course.moodleUrl,
        brightspaceUrl: course.brightspaceUrl,
        magicLink: buildInviteLink(token),
      });
    } catch (error) {
      console.error(`[batchExportAndSendAction] Skipped course ${courseId}:`, error);
      skipped++;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/communications");
  revalidatePath("/instructor");

  return { rows, skipped };
}
