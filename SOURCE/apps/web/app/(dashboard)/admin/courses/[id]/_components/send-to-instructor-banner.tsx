"use client"

import { useState, useTransition } from "react"
import { MailCheck, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  resendInstructorInviteAction,
  sendToInstructorAction,
} from "@/app/(dashboard)/admin/actions"
import { cn } from "@/lib/utils"

interface Props {
  courseId: string
  variant?: "send" | "resend"
}

export function SendToInstructorBanner({ courseId, variant = "send" }: Props) {
  const [isPending, startTransition] = useTransition()
  const isResend = variant === "resend"

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
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          {isResend ? "Ready to resend" : "Ready for handoff"}
        </p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
          {isResend
            ? "Address the instructor's questions, then resend the course for another round of review."
            : "Review the forms below, then send this course to the instructor."}
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
        disabled={isPending}
        onClick={handleSend}
      >
        <Send className="size-3.5" />
        {isPending ? "Sending…" : isResend ? "Resend to Instructor" : "Send to Instructor"}
      </Button>
    </div>
  )
}

/**
 * Shown while a course is with the instructor. Confirms the magic-link invite
 * was emailed and lets an admin re-send a fresh link without changing status.
 */
export function ResendInviteBanner({ courseId }: { courseId: string }) {
  const [isPending, startTransition] = useTransition()
  const [resent, setResent] = useState(false)

  function handleResend() {
    setResent(false)
    startTransition(async () => {
      await resendInstructorInviteAction(courseId)
      setResent(true)
    })
  }

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3",
      isPending && "opacity-60"
    )}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          Sign-in link emailed to the instructor
        </p>
        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
          {resent
            ? "A fresh sign-in link has been emailed — earlier links no longer work."
            : "The instructor can open their review dashboard from the emailed link. Resend it if they can't find it."}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
        disabled={isPending}
        onClick={handleResend}
      >
        <MailCheck className="size-3.5" />
        {isPending ? "Resending…" : "Resend invite link"}
      </Button>
    </div>
  )
}
