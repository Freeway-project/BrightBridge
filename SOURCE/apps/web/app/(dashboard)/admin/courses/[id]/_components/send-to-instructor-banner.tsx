"use client"

import { useTransition } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sendToInstructorAction } from "@/app/(dashboard)/admin/actions"
import { cn } from "@/lib/utils"

interface Props {
  courseId: string
}

export function SendToInstructorBanner({ courseId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    startTransition(async () => {
      await sendToInstructorAction(courseId)
    })
  }

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3",
      isPending && "opacity-60"
    )}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Ready for handoff</p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
          Review the forms below, then send this course to the instructor.
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
        disabled={isPending}
        onClick={handleSend}
      >
        <Send className="size-3.5" />
        {isPending ? "Sending…" : "Send to Instructor"}
      </Button>
    </div>
  )
}
