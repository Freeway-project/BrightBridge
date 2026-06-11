import "server-only";

import type { CommentRepository, CourseComment } from "@/lib/repositories/contracts";
import { getSupabaseAdminClientOrThrow } from "./shared";

export function createSupabaseCommentRepository(): CommentRepository {
  return {
    async listCourseComments(courseId, visibility) {
      const admin = getSupabaseAdminClientOrThrow();
      let query = admin
        .from("course_comments")
        .select(`
          *,
          profiles:author_id (
            full_name,
            email,
            role
          )
        `)
        .eq("course_id", courseId)
        .order("created_at", { ascending: true });
      if (visibility) query = query.eq("visibility", visibility);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data ?? []).map((comment) => {
        const row = comment as CourseComment & {
          profiles?: { full_name?: string | null; email?: string | null; role?: string | null } | null;
        };

        return {
          ...row,
          author_name: row.profiles?.full_name ?? undefined,
          author_email: row.profiles?.email ?? undefined,
          author_role: row.profiles?.role ?? undefined,
        };
      });
    },

    async postCourseComment(input) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_comments")
        .insert({
          course_id: input.courseId,
          author_id: input.authorId,
          body: input.body,
          visibility: input.visibility ?? "internal",
          parent_comment_id: input.parentCommentId ?? null,
          acting_on_behalf_of: input.actingOnBehalfOf ?? null,
        })
        .select(`
          *,
          profiles:author_id (
            full_name,
            email,
            role
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      const row = data as CourseComment & {
        profiles?: { full_name?: string | null; email?: string | null; role?: string | null } | null;
      };

      return {
        ...row,
        author_name: row.profiles?.full_name ?? undefined,
        author_email: row.profiles?.email ?? undefined,
        author_role: row.profiles?.role ?? undefined,
      };
    },
  };
}
