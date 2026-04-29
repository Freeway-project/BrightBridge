import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewSection = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  sort_order: number;
};

export type ReviewResponse = {
  id: string;
  course_id: string;
  section_id: string;
  responded_by: string;
  response_data: Record<string, unknown>;
  status: "draft" | "submitted";
  updated_at: string;
};

function admin() {
  const client = createAdminClient();
  if (!client) throw new Error("Admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY.");
  return client;
}

export async function getReviewSectionByKey(key: string): Promise<ReviewSection | null> {
  const { data, error } = await admin()
    .from("review_sections")
    .select("id, key, title, description, sort_order")
    .eq("key", key)
    .single();

  if (error) return null;
  return data as ReviewSection;
}

export async function getReviewResponse(
  courseId: string,
  sectionId: string,
): Promise<ReviewResponse | null> {
  const { data, error } = await admin()
    .from("review_responses")
    .select("*")
    .eq("course_id", courseId)
    .eq("section_id", sectionId)
    .maybeSingle();

  if (error) return null;
  return data as ReviewResponse | null;
}

export async function getReviewResponses(courseId: string): Promise<ReviewResponse[]> {
  const { data, error } = await admin()
    .from("review_responses")
    .select("*")
    .eq("course_id", courseId);

  if (error) return [];
  return (data ?? []) as ReviewResponse[];
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
  const { data, error } = await admin()
    .from("review_responses")
    .upsert(
      {
        course_id: courseId,
        section_id: sectionId,
        responded_by: userId,
        response_data: responseData,
        status,
      },
      { onConflict: "course_id,section_id" },
    )
    .select()
    .single();

  if (error) throw new Error(`upsertReviewResponse: ${error.message}`);
  return data as ReviewResponse;
}

export async function markAllResponsesSubmitted(courseId: string) {
  const { error } = await admin()
    .from("review_responses")
    .update({ status: "submitted" })
    .eq("course_id", courseId);

  if (error) throw new Error(`markAllResponsesSubmitted: ${error.message}`);
}
