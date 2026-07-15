import { StatCard, type StatCardIcon } from "@/components/shared/stat-card"
import { BUCKET_META } from "./bucket-badge"
import type { HandoffSummary } from "@/lib/admin/handoff-buckets"

interface Props {
  summary: HandoffSummary
}

type Tile = {
  label: string
  value: number | string
  icon: StatCardIcon
  accent?: string
  sub: string
  /** Native-tooltip explanation of what the number means. */
  hint: string
}

export function HandoffSummaryView({ summary: s }: Props) {
  const oldest = s.oldestDaysSinceSent
  const avg = s.avgDaysSinceSent

  const buckets: Tile[] = [
    {
      label: "In instructor hands",
      value: s.total,
      icon: "user-check",
      sub: `${s.opened} opened · ${s.neverOpened} not`,
      hint: "Courses sent to an instructor and not yet approved (sent, viewing, or questions).",
    },
    {
      label: "Overdue",
      value: s.overdue,
      icon: "alert-triangle",
      accent: BUCKET_META.overdue.accent,
      sub: s.overdueUnopened > 0 ? `${s.overdueUnopened} never opened` : "7+ days since sent",
      hint: BUCKET_META.overdue.description,
    },
    {
      label: "Aging",
      value: s.aging,
      icon: "clock",
      accent: BUCKET_META.aging.accent,
      sub: "3–6 days since sent",
      hint: BUCKET_META.aging.description,
    },
    {
      label: "Fresh",
      value: s.fresh,
      icon: "check-square",
      accent: BUCKET_META.fresh.accent,
      sub: "< 3 days since sent",
      hint: BUCKET_META.fresh.description,
    },
  ]

  const details: Tile[] = [
    {
      label: "Open rate",
      value: `${s.openRate}%`,
      icon: "book-open",
      accent: "#6366f1",
      sub: `${s.opened} of ${s.total} opened`,
      hint: "Share of sent courses the instructor has opened at least once.",
    },
    {
      label: "Never opened",
      value: s.neverOpened,
      icon: "book-open",
      accent: "#64748b",
      sub: "Instructor hasn't looked yet",
      hint: "No dashboard view recorded for the assigned instructor.",
    },
    {
      label: "Has questions",
      value: s.hasQuestions,
      icon: "alert-triangle",
      accent: "#f97316",
      sub: "Awaiting your reply",
      hint: "Instructor raised a question — the ball is back in your court.",
    },
    {
      label: "Oldest wait",
      value: oldest !== null ? `${oldest}d` : "—",
      icon: "clock",
      accent: "#8b5cf6",
      sub: avg !== null ? `avg ${avg}d across ${s.total}` : "No sent courses",
      hint: "Longest a course has waited since being sent; sub-line is the average wait.",
    },
  ]

  return (
    <div className="space-y-3">
      <TileRow tiles={buckets} startIndex={0} />
      <TileRow tiles={details} startIndex={4} />
    </div>
  )
}

function TileRow({ tiles, startIndex }: { tiles: Tile[]; startIndex: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t, i) => (
        <StatCard
          key={t.label}
          label={t.label}
          value={t.value}
          icon={t.icon}
          accent={t.accent}
          sub={t.sub}
          hint={t.hint}
          index={startIndex + i}
        />
      ))}
    </div>
  )
}
