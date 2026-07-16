import type { Role } from "@coursebridge/workflow";
import { requireProfile } from "@/lib/auth/context";
import { getSharedComments } from "@/lib/services/comments";
import { CourseCommentThreadClient } from "./CourseCommentThreadClient";

// Mirrors the allow-lists in shared-comment-actions.ts (server re-checks anyway;
// these only gate the UI affordances).
const CAN_POST: Role[] = ["instructor", "admin_full", "super_admin", "standard_user"];
const CAN_MARK_ANSWERED: Role[] = ["admin_full", "super_admin", "standard_user"];

function courseHrefForRole(role: Role, courseId: string): string {
  if (role === "instructor") return `/instructor/courses/${courseId}`;
  if (role === "standard_user") return `/courses/${courseId}`;
  return `/admin/courses/${courseId}`; // admin_full | admin_viewer | super_admin | provost
}

export async function CourseCommentThread({ courseId }: { courseId: string }) {
  const ctx = await requireProfile();
  const comments = await getSharedComments(courseId);
  const role = ctx.profile.role;

  return (
    <CourseCommentThreadClient
      courseId={courseId}
      currentUserId={ctx.userId}
      comments={comments}
      canPost={CAN_POST.includes(role)}
      canMarkAnswered={CAN_MARK_ANSWERED.includes(role)}
      openCourseHref={courseHrefForRole(role, courseId)}
    />
  );
}
