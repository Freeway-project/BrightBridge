"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { CourseChatPanel } from "@/app/(dashboard)/instructor/courses/[id]/_components/course-chat-panel";
import { useCourseCommentRealtime } from "@/lib/workspace/use-course-comment-realtime";
import type { CourseComment } from "@/lib/services/comments";

export function CourseCommentThreadClient({
  courseId,
  currentUserId,
  comments,
  canPost,
  canMarkAnswered,
  openCourseHref,
}: {
  courseId: string;
  currentUserId: string;
  comments: CourseComment[];
  canPost: boolean;
  canMarkAnswered: boolean;
  openCourseHref: string | null;
}) {
  const router = useRouter();
  useCourseCommentRealtime(courseId, () => router.refresh());

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {openCourseHref && (
        <div className="flex items-center justify-end border-b border-border px-3 py-2">
          <Link
            href={openCourseHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
            Open course
          </Link>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <CourseChatPanel
          courseId={courseId}
          comments={comments}
          currentUserId={currentUserId}
          canPost={canPost}
          canMarkAnswered={canMarkAnswered}
        />
      </div>
    </div>
  );
}
