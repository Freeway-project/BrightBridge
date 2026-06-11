import { HelpCircle } from "lucide-react"
import type { SubmissionEvent } from "@/lib/courses/service"

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

interface QuestionRoundBannerProps {
  rounds: SubmissionEvent[]
}

export function QuestionRoundBanner({ rounds }: QuestionRoundBannerProps) {
  if (rounds.length === 0) return null

  const latest = rounds[rounds.length - 1]
  const count = rounds.length

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-800 dark:text-blue-400">
      <HelpCircle className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-bold">
          {ordinal(count)} round of instructor questions
          {latest.actorName ? ` · ${latest.actorName}` : ""}
        </p>
        {latest.note && (
          <p className="text-xs font-medium opacity-80 break-words">{latest.note}</p>
        )}
      </div>
    </div>
  )
}
