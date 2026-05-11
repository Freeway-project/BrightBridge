"use client"

import { useState } from "react"
import { UnifiedChatModal } from "@/components/chat/unified-chat-modal"
import { WorkspaceNav } from "./workspace-nav"
import { InfoPanel } from "./info-panel"
import { TweakableContent } from "@/components/shared/tweakable-content"
import type { CourseStatus } from "@/lib/types"
import type { Comment, Escalation } from "@/lib/types"

interface CourseLayoutClientProps {
  children: React.ReactNode
  courseId: string
  courseTitle: string
  courseStatus: CourseStatus
  reviewerName: string
  reviewerId: string
  instructorName: string | null
  progress: Array<{ key: string; label: string; complete: boolean }>
  lastSavedAt: string | null
  escalations: Escalation[]
  comments: Comment[]
}

export function CourseLayoutClient({
  children,
  courseId,
  courseTitle,
  courseStatus,
  reviewerName,
  reviewerId,
  instructorName,
  progress,
  lastSavedAt,
  escalations,
  comments,
}: CourseLayoutClientProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <div className="flex flex-1 overflow-hidden">
      <WorkspaceNav
        courseId={courseId}
        courseTitle={courseTitle}
        courseStatus={courseStatus}
      />
      <TweakableContent className="flex flex-1 flex-col overflow-hidden">
        {children}
      </TweakableContent>
      <InfoPanel
        courseId={courseId}
        courseStatus={courseStatus}
        reviewerName={reviewerName}
        reviewerId={reviewerId}
        instructorName={instructorName}
        progress={progress}
        lastSavedAt={lastSavedAt}
        escalations={escalations}
        comments={comments}
      />
      <UnifiedChatModal
        courseId={courseId}
        currentUserId={reviewerId}
        comments={comments}
        escalations={escalations}
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
      />
    </div>
  )
}
