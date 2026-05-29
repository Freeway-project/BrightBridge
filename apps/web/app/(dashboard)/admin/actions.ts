"use server";

import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  assignUserToCourse,
  transitionCourseStatus,
} from "@/lib/courses/service";
import { requireAnyRole, requireProfile } from "@/lib/auth/context";
import { getAdminCoursesPage, getAdminCourseDetail } from "@/lib/admin/queries";
import { resolveEscalation } from "@/lib/services/escalations";

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
  const { getAuthService } = await import("@/lib/auth/service");
  const { assignUserToCourse } = await import("@/lib/courses/service");

  try {
    const profiles = getProfileRepository();
    const auth = getAuthService();

    // 1. Check if user exists by email
    // We don't have a direct getByEmail in contract but we can use listUsers or similar, 
    // or just try to create and handle conflict.
    // Actually, upsertProfile works if we have an ID.
    // For now, let's try to create the auth user. If they exist, we'll get an error.
    
    let userId: string;

    try {
      const user = await auth.createUserWithPassword({
        email,
        password: Math.random().toString(36).slice(-12), // Random password for now
        emailConfirm: true,
        userMetadata: {
          full_name: fullName,
          role: "instructor",
        },
      });
      userId = user.id;
    } catch (error: any) {
      if (error.message?.includes("already registered") || error.message?.includes("already exists")) {
        // Find existing user ID
        const admin = (await import("@/lib/supabase/admin")).createAdminClient();
        if (!admin) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
        const { data } = await admin.auth.admin.listUsers();
        const existing = data.users.find(u => u.email?.toLowerCase() === email);
        if (!existing) throw new Error("User exists in auth but could not be found.");
        userId = existing.id;
      } else {
        throw error;
      }
    }

    // 2. Ensure profile exists and has instructor role
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

export async function sendToInstructorAction(courseId: string): Promise<void> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "admin_viewer", "super_admin"]);
  await transitionCourseStatus({
    courseId,
    toStatus: "sent_to_instructor",
    note: "Sent to instructor by communications.",
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/communications");
  revalidatePath(`/communications/courses/${courseId}`);
  revalidatePath("/ta");
  revalidatePath("/instructor");
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
