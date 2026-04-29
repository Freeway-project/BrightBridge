import { createAdminClient } from "@/lib/supabase/admin"

export type CourseComment = {
  id: string
  course_id: string
  author_id: string
  author_name?: string
  author_role?: string
  author_email?: string
  body: string
  visibility: "internal" | "instructor_visible"
  parent_comment_id: string | null
  created_at: string
}

export async function getCourseComments(courseId: string): Promise<CourseComment[]> {
  const supabase = createAdminClient()
  if (!supabase) throw new Error("Supabase admin client not available")

  const { data, error } = await supabase
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
    .order("created_at", { ascending: true })

  if (error) throw error

  return (data ?? []).map((c: any) => ({
    ...c,
    author_name: c.profiles?.full_name,
    author_email: c.profiles?.email,
    author_role: c.profiles?.role,
  }))
}

export async function postCourseComment({
  courseId,
  authorId,
  body,
  visibility = "internal",
  parentCommentId = null,
}: {
  courseId: string
  authorId: string
  body: string
  visibility?: "internal" | "instructor_visible"
  parentCommentId?: string | null
}): Promise<CourseComment> {
  const supabase = createAdminClient()
  if (!supabase) throw new Error("Supabase admin client not available")

  const { data, error } = await supabase
    .from("course_comments")
    .insert({
      course_id: courseId,
      author_id: authorId,
      body,
      visibility,
      parent_comment_id: parentCommentId,
    })
    .select(`
      *,
      profiles:author_id (
        full_name,
        email,
        role
      )
    `)
    .single()

  if (error) throw error

  const c = data as any
  return {
    ...c,
    author_name: c.profiles?.full_name,
    author_email: c.profiles?.email,
    author_role: c.profiles?.role,
  }
}
