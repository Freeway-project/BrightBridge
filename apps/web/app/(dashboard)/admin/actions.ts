"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  assignUserToCourse,
  getAccessibleCourses,
  transitionCourseStatus,
} from "@/lib/courses/service";

export type AssignTaState = {
  kind: "idle" | "success" | "error";
  message: string | null;
};

export async function assignTaToCourseAction(
  _state: AssignTaState,
  formData: FormData,
): Promise<AssignTaState> {
  const courseId = String(formData.get("courseId") ?? "");
  const profileId = String(formData.get("profileId") ?? "");

  if (!courseId || !profileId) {
    return {
      kind: "error",
      message: "Select both a course and a staff member.",
    };
  }

  const { courses } = await getAccessibleCourses();
  const course = courses.find((item) => item.id === courseId);

  if (!course) {
    return {
      kind: "error",
      message: "Course not found or not accessible.",
    };
  }

  try {
    await assignUserToCourse({
      courseId,
      profileId,
      role: "staff",
    });

    if (course.status === "course_created") {
      await transitionCourseStatus({
        courseId,
        toStatus: "assigned_to_ta",
        note: "Staff assigned by admin.",
      });
    }

    revalidatePath("/admin");
    revalidatePath("/ta");
    revalidatePath(`/courses/${courseId}`);

    return {
      kind: "success",
      message: "Staff member assigned to course.",
    };
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Could not assign staff member.",
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
