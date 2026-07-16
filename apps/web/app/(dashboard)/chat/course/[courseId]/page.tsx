import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/context";
import { canAccessCourseChat } from "@/lib/services/course-chat";
import { CourseCommentThread } from "../../_components/CourseCommentThread";

export default async function CourseChatPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  await requireProfile();
  if (!(await canAccessCourseChat(courseId))) notFound();
  return <CourseCommentThread courseId={courseId} />;
}
