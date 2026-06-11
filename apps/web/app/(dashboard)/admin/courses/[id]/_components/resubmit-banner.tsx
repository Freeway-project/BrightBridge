import { RefreshCw } from "lucide-react"
import type { SubmissionEvent } from "@/lib/courses/service"

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

interface ResubmitBannerProps {
  submissions: SubmissionEvent[]
}

export function ResubmitBanner({ submissions }: ResubmitBannerProps) {
  if (submissions.length <= 1) return null

  const latest = submissions[submissions.length - 1]
  const count = submissions.length

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-amber-800 dark:text-amber-400">
      <RefreshCw className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-bold">
          {ordinal(count)} submission
          {latest.actorName ? ` · ${latest.actorName}` : ""}
        </p>
        {latest.note && (
          <p className="text-xs font-medium opacity-80 break-words">{latest.note}</p>
        )}
      </div>
    </div>
  )
}
