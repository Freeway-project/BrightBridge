import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/shared/stat-card"
import { cn } from "@/lib/utils"
import { Users } from "lucide-react"
import { BUCKET_META } from "./bucket-badge"
import type { HandoffSummary } from "@/lib/admin/handoff-buckets"
import type { InstructorRollup } from "@/lib/admin/queries"

interface Props {
  summary: HandoffSummary
  byInstructor: InstructorRollup[]
}

export function HandoffSummaryView({ summary, byInstructor }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="In instructor hands"
          value={summary.total}
          icon="user-check"
          index={0}
        />
        <StatCard
          label="Overdue"
          value={summary.overdue}
          icon="alert-triangle"
          accent={BUCKET_META.overdue.accent}
          sub={summary.overdueUnopened > 0 ? `${summary.overdueUnopened} never opened` : "7+ days sent"}
          index={1}
        />
        <StatCard
          label="Aging"
          value={summary.aging}
          icon="clock"
          accent={BUCKET_META.aging.accent}
          sub="3–6 days sent"
          index={2}
        />
        <StatCard
          label="Fresh"
          value={summary.fresh}
          icon="check-square"
          accent={BUCKET_META.fresh.accent}
          sub="< 3 days sent"
          index={3}
        />
        <StatCard
          label="Never opened"
          value={summary.neverOpened}
          icon="book-open"
          accent="#64748b"
          sub="Instructor hasn't looked"
          index={4}
        />
        <StatCard
          label="Has questions"
          value={summary.hasQuestions}
          icon="alert-triangle"
          accent="#f97316"
          sub="Awaiting your reply"
          index={5}
        />
      </div>

      {byInstructor.length > 0 ? (
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              <Users className="size-3.5 text-muted-foreground/70" />
              By Instructor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[240px] overflow-y-auto pr-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    <th className="py-1.5 pr-2 text-left font-bold">Instructor</th>
                    <th className="px-2 py-1.5 text-right font-bold">Overdue</th>
                    <th className="px-2 py-1.5 text-right font-bold">Aging</th>
                    <th className="px-2 py-1.5 text-right font-bold">Fresh</th>
                    <th className="py-1.5 pl-2 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {byInstructor.map((row, i) => (
                    <tr
                      key={row.instructorEmail ?? `unassigned-${i}`}
                      className="border-b border-border/30 last:border-0"
                    >
                      <td className="min-w-0 max-w-[220px] truncate py-2 pr-2 font-medium text-foreground">
                        {row.instructorName || row.instructorEmail || (
                          <span className="italic text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        <BucketCount value={row.summary.overdue} bucket="overdue" />
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        <BucketCount value={row.summary.aging} bucket="aging" />
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        <BucketCount value={row.summary.fresh} bucket="fresh" />
                      </td>
                      <td className="py-2 pl-2 text-right font-bold tabular-nums text-foreground">
                        {row.summary.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function BucketCount({ value, bucket }: { value: number; bucket: keyof typeof BUCKET_META }) {
  if (value === 0) return <span className="text-muted-foreground/40">0</span>
  return (
    <span className={cn("font-bold", BUCKET_META[bucket].chip, "rounded-md px-1.5 py-0.5")}>
      {value}
    </span>
  )
}
