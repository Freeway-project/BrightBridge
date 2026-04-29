"use server";

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
      message: "Select both a course and a TA.",
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
      role: "ta",
    });

    if (course.status === "course_created") {
      await transitionCourseStatus({
        courseId,
        toStatus: "assigned_to_ta",
        note: "TA assigned by admin.",
      });
    }

    revalidatePath("/admin");
    revalidatePath("/ta");
    revalidatePath(`/courses/${courseId}`);

    return {
      kind: "success",
      message: "TA assigned to course.",
    };
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Could not assign TA.",
    };
  }
}
