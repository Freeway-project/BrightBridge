"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/context";
import {
  getReviewSectionByKey,
  upsertReviewResponse,
  markAllResponsesSubmitted,
} from "@/lib/services/review";
import { transitionCourseStatus, getCourseById } from "@/lib/services/courses";
import type { SectionKey } from "./types";
import {
  metadataSchema,
  reviewMatrixSchema,
  syllabusGradebookSchema,
  issueLogSchema,
} from "./schemas";
import type { ZodTypeAny } from "zod";

const SECTION_SCHEMAS: Partial<Record<SectionKey, ZodTypeAny>> = {
  course_metadata: metadataSchema,
  review_matrix: reviewMatrixSchema,
  syllabus_review: syllabusGradebookSchema,
  general_notes: issueLogSchema,
};

export async function saveDraft(
  courseId: string,
  sectionKey: SectionKey,
  data: unknown,
): Promise<{ ok: boolean; savedAt: string }> {
  const ctx = await requireProfile();
  const course = await getCourseById(courseId, ctx.userId);
  if (!course) throw new Error("Course not found or not accessible.");

  const schema = SECTION_SCHEMAS[sectionKey];
  const parsed = schema ? schema.safeParse(data) : { success: true, data };
  if (!parsed.success) {
    throw new Error(`Invalid data for section ${sectionKey}`);
  }

  const section = await getReviewSectionByKey(sectionKey);
  if (!section) throw new Error(`Section not found: ${sectionKey}`);

  await upsertReviewResponse({
    courseId,
    sectionId: section.id,
    userId: ctx.userId,
    responseData: (parsed as { success: true; data: Record<string, unknown> }).data,
    status: "draft",
  });

  return { ok: true, savedAt: new Date().toISOString() };
}

export async function submitReview(courseId: string): Promise<void> {
  const ctx = await requireProfile();
  const course = await getCourseById(courseId, ctx.userId);
  if (!course) throw new Error("Course not found or not accessible.");

  const fromStatus =
    course.status === "assigned_to_ta" || course.status === "admin_changes_requested"
      ? "ta_review_in_progress"
      : course.status;

  if (course.status !== fromStatus) {
    await transitionCourseStatus({
      courseId,
      from: course.status,
      to: fromStatus,
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      note: "TA review started",
    });
  }

  await markAllResponsesSubmitted(courseId);
  await transitionCourseStatus({
    courseId,
    from: fromStatus,
    to: "submitted_to_admin",
    actorId: ctx.userId,
    actorRole: ctx.profile.role,
    note: "TA submitted review",
  });

  revalidatePath("/ta");
  revalidatePath(`/courses/${courseId}`);
  redirect("/ta");
}
