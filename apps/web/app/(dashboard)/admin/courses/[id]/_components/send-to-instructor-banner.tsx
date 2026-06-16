"use client"

import { useTransition } from "react"
import { Download, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  resendInstructorInviteAction,
  sendToInstructorAction,
} from "@/app/(dashboard)/admin/actions"
import { cn } from "@/lib/utils"

type ActionVariant = "send" | "resend" | "refresh"

type MailMergeRow = Awaited<ReturnType<typeof sendToInstructorAction>>[number]

interface Props {
  courseId: string
  variant?: ActionVariant
}

function buildCsv(rows: MailMergeRow[]): string {
  const header = ["Instructor Name", "Instructor Email", "Course Title", "Invite Link", "Invite Expires At"]
  const escapeCell = (value: string) => {
    const normalized = value.replace(/\r?\n/g, " ")
    return /[",\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized
  }

  return [
    header,
    ...rows.map((row) => [
      row.instructorName,
      row.instructorEmail,
      row.courseTitle,
      row.inviteLink,
      row.expiresAt,
    ]),
  ]
    .map((cells) => cells.map(escapeCell).join(","))
    .join("\n")
}

function downloadCsv(courseId: string, rows: MailMergeRow[]) {
  const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  const stamp = new Date().toISOString().slice(0, 10)
  anchor.href = url
  anchor.download = `coursebridge-instructor-mail-merge-${courseId}-${stamp}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function SendToInstructorBanner({ courseId, variant = "send" }: Props) {
  const [isPending, startTransition] = useTransition()
  const isResend = variant === "resend"
  const isRefresh = variant === "refresh"

  function handleSend() {
    startTransition(async () => {
      const rows = isResend || isRefresh
        ? await resendInstructorInviteAction(courseId)
        : await sendToInstructorAction(courseId)
      downloadCsv(courseId, rows)
    })
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3",
        isPending && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          {isResend ? "Ready for another review round" : isRefresh ? "Manual outreach export" : "Ready for handoff"}
        </p>
        <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/70">
          {isResend
            ? "Generate a fresh CSV with new invite links before you send the next manual mail merge."
            : isRefresh
              ? "Download a fresh CSV for manual mail merge. Earlier unused links for this course will stop working."
              : "Review the forms below, then mark the course sent and download a CSV for manual mail merge."}
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0 gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
        disabled={isPending}
        onClick={handleSend}
      >
        {isResend || isRefresh ? <Download className="size-3.5" /> : <Send className="size-3.5" />}
        {isPending ? "Preparing CSV…" : isResend ? "Download Fresh CSV" : isRefresh ? "Download CSV" : "Send to Instructor + CSV"}
      </Button>
    </div>
  )
}

interface ResendInviteBannerProps {
  courseId: string
}

/**
 * Once a course is with the instructor, admins can generate a fresh CSV for
 * manual mail merge. Doing so issues new invite links and invalidates any
 * older unaccepted links for the same recipients.
 */
export function ResendInviteBanner({ courseId }: ResendInviteBannerProps) {
  return <SendToInstructorBanner courseId={courseId} variant="refresh" />
}
