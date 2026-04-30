import "server-only";

import { getReviewRepository } from "@/lib/repositories";
import type { ReviewResponse, ReviewSection } from "@/lib/repositories/contracts";
export type { ReviewResponse, ReviewSection } from "@/lib/repositories/contracts";

export async function getReviewSectionByKey(key: string): Promise<ReviewSection | null> {
  return getReviewRepository().getReviewSectionByKey(key);
}

export async function getReviewResponse(
  courseId: string,
  sectionId: string,
): Promise<ReviewResponse | null> {
  return getReviewRepository().getReviewResponse(courseId, sectionId);
}

export async function getReviewResponses(courseId: string): Promise<ReviewResponse[]> {
  return getReviewRepository().listReviewResponses(courseId);
}

export async function upsertReviewResponse({
  courseId,
  sectionId,
  userId,
  responseData,
  status = "draft",
}: {
  courseId: string;
  sectionId: string;
  userId: string;
  responseData: Record<string, unknown>;
  status?: "draft" | "submitted";
}): Promise<ReviewResponse> {
  return getReviewRepository().upsertReviewResponse({
    courseId,
    sectionId,
    userId,
    responseData,
    status,
  });
}

export async function markAllResponsesSubmitted(courseId: string) {
  await getReviewRepository().markAllResponsesSubmitted(courseId);
}
