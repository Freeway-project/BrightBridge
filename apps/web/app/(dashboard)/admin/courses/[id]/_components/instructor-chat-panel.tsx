"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react"
import type { CourseComment } from "@/lib/services/comments"
import { CourseChatPanel } from "@/app/(dashboard)/instructor/courses/[id]/_components/course-chat-panel"

interface Props {
  courseId: string
  comments: CourseComment[]
  currentUserId: string
}

export function InstructorChatPanel({ courseId, comments, currentUserId }: Props) {
  const [open, setOpen] = useState(false)
  const unanswered = comments.filter((c) => c.is_question && !c.is_answered).length

  return (
    <div className="mt-6 rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors rounded-xl"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
          Chat with Instructor
          {comments.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              {unanswered > 0 ? `${unanswered} unanswered` : `${comments.length}`}
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t border-border h-[420px] p-3">
          <CourseChatPanel
            courseId={courseId}
            comments={comments}
            currentUserId={currentUserId}
            canPost={true}
            canMarkAnswered={true}
          />
        </div>
      )}
    </div>
  )
}
