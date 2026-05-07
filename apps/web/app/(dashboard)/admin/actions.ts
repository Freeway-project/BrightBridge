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
    toStatus: "ready_for_instructor",
    note: "Approved by admin.",
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/courses/${courseId}`);
  redirect("/admin");
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

export async function resolveEscalationAction(escalationId: string, courseId: string): Promise<void> {
  const ctx = await requireProfile();
  await resolveEscalation(escalationId, ctx.userId);
  revalidatePath("/admin");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}
