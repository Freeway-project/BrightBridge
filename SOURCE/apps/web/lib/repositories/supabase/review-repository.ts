import "server-only";

import type {
  ReviewProgress,
  ReviewRepository,
  ReviewResponse,
  ReviewSection,
  SectionProgress,
} from "@/lib/repositories/contracts";
import { getSupabaseAdminClientOrThrow } from "./shared";

export function createSupabaseReviewRepository(): ReviewRepository {
  return {
    async getReviewSectionByKey(key) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("review_sections")
        .select("id, key, title, description, sort_order")
        .eq("key", key)
        .single();

      if (error) {
        return null;
      }

      return data as ReviewSection;
    },

    async listReviewResponses(courseId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin.from("review_responses").select("*").eq("course_id", courseId);

      if (error) {
        return [];
      }

      return (data ?? []) as ReviewResponse[];
    },

    async getReviewResponse(courseId, sectionId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("review_responses")
        .select("*")
        .eq("course_id", courseId)
        .eq("section_id", sectionId)
        .maybeSingle();

      if (error) {
        return null;
      }

      return (data as ReviewResponse | null) ?? null;
    },

    async upsertReviewResponse(input) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("review_responses")
        .upsert(
          {
            course_id: input.courseId,
            section_id: input.sectionId,
            responded_by: input.userId,
            response_data: input.responseData,
            status: input.status ?? "draft",
          },
          { onConflict: "course_id,section_id" },
        )
        .select()
        .single();

      if (error) {
        throw new Error(`upsertReviewResponse: ${error.message}`);
      }

      return data as ReviewResponse;
    },

    async markAllResponsesSubmitted(courseId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { error } = await admin
        .from("review_responses")
        .update({ status: "submitted" })
        .eq("course_id", courseId);

      if (error) {
        throw new Error(`markAllResponsesSubmitted: ${error.message}`);
      }
    },

    async getReviewProgressForCourses(courseIds) {
      if (courseIds.length === 0) {
        return new Map();
      }

      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("review_responses")
        .select("course_id, status, response_data, review_sections!inner(key)")
        .in("course_id", courseIds)
        .in("review_sections.key", ["course_metadata", "review_matrix", "syllabus_review"]);

      if (error) {
        return new Map();
      }

      const defaultSection = (): SectionProgress => ({ exists: false, status: null, responseData: null });
      const map = new Map<string, ReviewProgress>(
        courseIds.map((id) => [
          id,
          {
            courseMetadata: defaultSection(),
            reviewMatrix: defaultSection(),
            syllabusReview: defaultSection(),
          },
        ]),
      );

      for (const row of (data ?? []) as Array<{
        course_id: string;
        status: "draft" | "submitted";
        response_data: Record<string, unknown>;
        review_sections: { key: string } | { key: string }[];
      }>) {
        const progress = map.get(row.course_id);

        if (!progress) {
          continue;
        }

        const section: SectionProgress = {
          exists: true,
          status: row.status,
          responseData: row.response_data,
        };
        // Supabase returns a many-to-one join as a plain object, not an array
        const key = Array.isArray(row.review_sections)
          ? row.review_sections[0]?.key
          : row.review_sections?.key;

        if (key === "course_metadata") progress.courseMetadata = section;
        if (key === "review_matrix") progress.reviewMatrix = section;
        if (key === "syllabus_review") progress.syllabusReview = section;
      }

      return map;
    },

    async getSectionKeyById() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data } = await admin.from("review_sections").select("id, key");
      const sectionKeyById: Record<string, string> = {};

      for (const section of data ?? []) {
        sectionKeyById[section.id] = section.key;
      }

      return sectionKeyById;
    },
  };
}
