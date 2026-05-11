"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MessageSquare } from "lucide-react"
import { CourseConversation } from "@/app/(dashboard)/courses/[id]/_components/course-conversation"
import type { EscalationWithMessages } from "@/lib/services/escalations"
import type { CourseComment } from "@/lib/services/comments"

interface UnifiedChatModalProps {
  courseId: string
  currentUserId: string
  comments: CourseComment[]
  escalations: EscalationWithMessages[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function UnifiedChatModal({
  courseId,
  currentUserId,
  comments,
  escalations,
  isOpen,
  onOpenChange,
}: UnifiedChatModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            Course Discussion
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <CourseConversation
            courseId={courseId}
            currentUserId={currentUserId}
            comments={comments}
            escalations={escalations}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
