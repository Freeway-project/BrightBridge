import { formatDistanceToNow } from "date-fns"

import type { InstructorEmailRow } from "@/lib/instructor-emails/types"
import { cn } from "@/lib/utils"
import { OpenedDot } from "@/components/instructor/opened-dot"

interface Props {
  emails: InstructorEmailRow[]
  /** First time the instructor opened the dashboard for this course, if ever. */
  instructorFirstOpenedAt?: string | null
}

const STATUS_STYLES: Record<
  InstructorEmailRow["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-500/10 text-amber-700 border-amber-400/40 dark:text-amber-400",
  },
  sent: {
    label: "Sent",
    className:
      "bg-emerald-500/10 text-emerald-700 border-emerald-400/40 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-700 border-red-400/40 dark:text-red-400",
  },
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return `${date.toLocaleString()} (${formatDistanceToNow(date, { addSuffix: true })})`
}

function truncateError(value: string | null, max = 160): string | null {
  if (!value) return null
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export function EmailsList({ emails, instructorFirstOpenedAt }: Props) {
  if (emails.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        No instructor emails have been sent for this course yet.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card divide-y divide-border">
      {emails.map((email) => {
        const status = STATUS_STYLES[email.status]
        const truncatedError = truncateError(email.sendError)
        return (
          <div key={email.id} className="p-4 flex flex-col gap-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {email.subject}
                </p>
                <p className="text-xs text-muted-foreground">
                  To <span className="font-medium">{email.recipient}</span>
                  {email.sentByName ? ` · sent by ${email.sentByName}` : null}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border",
                  status.className,
                )}
              >
                {status.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>Created {formatTimestamp(email.createdAt)}</span>
              {email.sentAt ? (
                <span>· Delivered {formatTimestamp(email.sentAt)}</span>
              ) : null}
              {email.status === "sent" && instructorFirstOpenedAt &&
              new Date(instructorFirstOpenedAt) >= new Date(email.sentAt ?? email.createdAt) ? (
                <span className="inline-flex items-center gap-1">
                  · <OpenedDot openedAt={instructorFirstOpenedAt} size="sm" />
                  Opened {formatTimestamp(instructorFirstOpenedAt)}
                </span>
              ) : email.status === "sent" ? (
                <span className="inline-flex items-center gap-1">
                  · <OpenedDot openedAt={null} size="sm" /> Not opened yet
                </span>
              ) : null}
              {email.provider ? (
                <span className="font-mono">· via {email.provider}</span>
              ) : null}
              {email.providerMessageId ? (
                <span className="font-mono truncate max-w-[18rem]">
                  · id {email.providerMessageId}
                </span>
              ) : null}
            </div>

            {truncatedError ? (
              <p className="text-xs text-red-700 dark:text-red-400 mt-1 break-words">
                <span className="font-semibold">Error:</span> {truncatedError}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
