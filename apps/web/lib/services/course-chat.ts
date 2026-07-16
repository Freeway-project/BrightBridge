import "server-only";

import { resolveAccessibleScope } from "@/lib/courses/service";
import { getCourseChatRepository } from "@/lib/repositories";
import type { CourseChatInboxItem } from "@/lib/repositories/contracts";

/**
 * All courses the current user can access that have "Chat with Instructor"
 * (instructor_visible) activity, most-recent first. Empty when there is no
 * authenticated profile.
 */
export async function getCourseChatInbox(): Promise<CourseChatInboxItem[]> {
  const { scope } = await resolveAccessibleScope();
  if (!scope) return [];
  return getCourseChatRepository().listCourseChatInbox(scope);
}

/** Whether the current user may open the course-chat thread for `courseId`. */
export async function canAccessCourseChat(courseId: string): Promise<boolean> {
  const { scope } = await resolveAccessibleScope();
  if (!scope) return false;
  return getCourseChatRepository().isCourseAccessible(scope, courseId);
}
