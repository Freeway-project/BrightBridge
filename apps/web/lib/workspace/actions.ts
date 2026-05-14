 "use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
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

import { isReadonlyMode } from "@/lib/system-migration";

const SECTION_SCHEMAS: Partial<Record<SectionKey, ZodTypeAny>> = {
  course_metadata: metadataSchema,
  review_matrix: reviewMatrixSchema,
  syllabus_review: syllabusGradebookSchema,
  general_notes: issueLogSchema,
};

async function isCurrentHostReadonly(): Promise<boolean> {
  const headerStore = await headers();
  return isReadonlyMode(headerStore.get("host"));
}

export async function startTaReview(courseId: string): Promise<void> {
  if (await isCurrentHostReadonly()) return;
  const ctx = await requireProfile();
  try {
    const course = await getCourseById(courseId, ctx.userId, ctx.profile.role);
    if (!course) return;

    if (course.status === "assigned_to_ta") {
      await transitionCourseStatus({
        courseId,
        from: "assigned_to_ta",
        to: "ta_review_in_progress",
        actorId: ctx.userId,
        actorRole: ctx.profile.role,
        note: "TA opened workspace",
      });
    }
  } catch (error) {
    Sentry.captureException(error);
  }
}

export async function saveDraft(
  courseId: string,
  sectionKey: SectionKey,
  data: unknown,
): Promise<{ ok: boolean; savedAt: string; error?: string }> {
  if (await isCurrentHostReadonly()) {
    return { ok: false, savedAt: "", error: "System migration in progress. Saving is disabled to prevent data loss." };
  }
  const ctx = await requireProfile();
  try {
    const course = await getCourseById(courseId, ctx.userId, ctx.profile.role);
    if (!course) {
      return { ok: false, savedAt: "", error: "Course not found or assignment was revoked. Refreshing..." };
    }

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
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag("area", "ta_workspace");
      scope.setTag("action", "save_draft");
      scope.setTag("section_key", sectionKey);
      scope.setContext("save_draft", {
        actorId: ctx.userId,
        actorRole: ctx.profile.role,
        courseId,
      });
      Sentry.captureException(error instanceof Error ? error : new Error("saveDraft failed"));
    });
    throw error;
  }
}

export async function submitReview(courseId: string): Promise<{ ok: boolean; error?: string }> {
  if (await isCurrentHostReadonly()) {
    return { ok: false, error: "System migration in progress. Submissions are temporarily disabled." };
  }
  const ctx = await requireProfile();
  try {
    const course = await getCourseById(courseId, ctx.userId, ctx.profile.role);
    if (!course) {
      return { ok: false, error: "Course not found or assignment was revoked. Refreshing..." };
    }

    // Idempotency guard: avoid throwing on repeat submit clicks/race conditions
    // when the course is already in the target status.
    if (course.status === "submitted_to_admin") {
      revalidatePath("/ta");
      revalidatePath(`/courses/${courseId}`);
      return { ok: true };
    }

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
    return { ok: true };
  } catch (error) {
    console.error("submitReview failed", {
      courseId,
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      error,
    });
    Sentry.withScope((scope) => {
      scope.setTag("area", "ta_workspace");
      scope.setTag("action", "submit_review");
      scope.setContext("submit_review", {
        actorId: ctx.userId,
        actorRole: ctx.profile.role,
        courseId,
      });
      Sentry.captureException(error instanceof Error ? error : new Error("submitReview failed"));
    });
    return { ok: false, error: "Failed to submit review. Please try again." };
  }
}
