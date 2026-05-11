"use client"

import { UnifiedChatModal } from "@/components/chat/unified-chat-modal"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { AdminCourseSidebar } from "./admin-course-sidebar"
import { useModalContext } from "@/lib/contexts/modal-context"
import type { Course, Comment, Escalation } from "@/lib/types"

interface AdminCourseLayoutClientProps {
  children: React.ReactNode
  courseId: string
  course: Course
  escalations: Escalation[]
  departments: Array<{ id: string; name: string }>
  comments: Comment[]
  currentUserId: string
  instructorName: string | null
}

export function AdminCourseLayoutClient({
  children,
  courseId,
  course,
  escalations,
  departments,
  comments,
  currentUserId,
  instructorName,
}: AdminCourseLayoutClientProps) {
  const { isChatOpen, setIsChatOpen } = useModalContext()

  return (
    <main className="flex-1 flex overflow-hidden bg-muted/10">
      {/* Main Content Area */}
      <TweakableContent className="flex-1 overflow-y-auto p-6">
        {children}
      </TweakableContent>

      {/* Sidebar Panel */}
      <aside className="flex-shrink-0 flex overflow-hidden">
        <AdminCourseSidebar
          course={course}
          escalations={escalations}
          currentUserId={currentUserId}
          departments={departments}
          comments={comments}
          instructorName={instructorName}
        />
      </aside>

      {/* Chat Modal */}
      <UnifiedChatModal
        courseId={courseId}
        currentUserId={currentUserId}
        comments={comments}
        escalations={escalations}
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
      />
    </main>
  )
}
