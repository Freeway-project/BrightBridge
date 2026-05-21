"use client"

import { useTransition } from "react"
import { CheckCircle2, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CourseStatus } from "@coursebridge/workflow"
import { instructorApproveAction, instructorRaiseQuestionAction } from "../actions"

interface Props {
  courseId: string
  status: CourseStatus
}

export function InstructorCourseActions({ courseId, status }: Props) {
  const [isPending, startTransition] = useTransition()

  if (status !== "sent_to_instructor") return null

  return (
    <div className="flex items-center gap-2 pb-1">
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 text-xs"
        disabled={isPending}
        onClick={() => startTransition(() => instructorRaiseQuestionAction(courseId))}
      >
        <HelpCircle className="size-3.5" />
        Raise a Question
      </Button>
      <Button
        size="sm"
        className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white"
        disabled={isPending}
        onClick={() => startTransition(() => instructorApproveAction(courseId))}
      >
        <CheckCircle2 className="size-3.5" />
        {isPending ? "Saving…" : "Approve Course"}
      </Button>
    </div>
  )
}
