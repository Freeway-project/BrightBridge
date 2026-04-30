import "server-only";

import type { CommentRepository, CourseComment } from "@/lib/repositories/contracts";
import { getSupabaseAdminClientOrThrow } from "./shared";

export function createSupabaseCommentRepository(): CommentRepository {
  return {
    async listCourseComments(courseId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
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
