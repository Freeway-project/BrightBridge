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

interface ResendInviteBannerProps {
  courseId: string
  /**
   * Whether the most recent instructor email for this course failed. Resend
   * is only offered (and the action only succeeds) when this is true — a
   * successful previous send already gave the instructor a working link.
   * The "no banner at all" path: parent passes false and we render null.
   */
  lastSendFailed: boolean
  /** Optional snippet of the last send_error to give context for the failure. */
  lastSendError?: string | null
}

/**
 * Shown while a course is with the instructor AND the last email failed.
 * Lets an admin re-send a fresh link without changing course status.
 * When the previous send succeeded the banner is hidden entirely — the
 * instructor already has a working link, so a resend would be a no-op or
 * worse, invalidate a working magic-link unnecessarily.
 */
export function ResendInviteBanner({
  courseId,
  lastSendFailed,
  lastSendError,
}: ResendInviteBannerProps) {
  const [isPending, startTransition] = useTransition()
  const [resent, setResent] = useState(false)

  if (!lastSendFailed) return null

  function handleResend() {
    setResent(false)
    startTransition(async () => {
      await resendInstructorInviteAction(courseId)
      setResent(true)
    })
  }

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3",
      isPending && "opacity-60"
    )}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
          Last instructor email failed
        </p>
        <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
          {resent
            ? "A fresh sign-in link has been emailed — earlier links no longer work."
            : lastSendError
              ? `Provider error: ${lastSendError}. Resend a fresh link to try again.`
              : "The instructor did not receive a working sign-in link. Resend to try again."}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 gap-1.5 border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-400"
        disabled={isPending}
        onClick={handleResend}
      >
        <MailCheck className="size-3.5" />
        {isPending ? "Resending…" : "Resend invite link"}
      </Button>
    </div>
  )
}
