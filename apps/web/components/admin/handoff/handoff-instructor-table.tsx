import { cn } from "@/lib/utils"
import { HANDOFF_THRESHOLDS } from "@/lib/admin/handoff-buckets"
import type { InstructorRollup } from "@/lib/admin/queries"
import { BUCKET_META } from "./bucket-badge"

interface Props {
  rows: InstructorRollup[]
}

/**
 * Per-instructor rollup: one row per professor with bucket counts, unopened
 * count, open rate, and longest wait — so an admin can see at a glance who is
 * sitting on the most (or the most-overdue) work.
 */
export function HandoffInstructorTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No courses are currently in an instructor&rsquo;s hands.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
            <Th className="text-left">Instructor</Th>
            <Th>In hands</Th>
            <Th>Overdue</Th>
            <Th>Aging</Th>
            <Th>Fresh</Th>
            <Th>Unopened</Th>
            <Th className="text-left">Open rate</Th>
            <Th>Oldest</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const s = row.summary
            const urgent = s.overdue > 0
            return (
              <tr
                key={row.instructorEmail ?? `unassigned-${i}`}
                className={cn(
                  "group transition-colors hover:bg-muted/40",
                  urgent && "bg-red-500/[0.03]",
                )}
              >
                <Td
                  className={cn(
                    "max-w-[240px] border-l-2 text-left",
                    urgent ? "border-l-red-500/60" : "border-l-transparent",
                  )}
                >
                  <span className="block truncate font-semibold text-foreground">
                    {row.instructorName || row.instructorEmail || (
                      <span className="italic text-muted-foreground">Unassigned</span>
                    )}
                  </span>
                  {row.instructorName && row.instructorEmail ? (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {row.instructorEmail}
                    </span>
                  ) : null}
                </Td>
                <Td className="font-black tabular-nums text-foreground">{s.total}</Td>
                <Td><Count value={s.overdue} bucket="overdue" /></Td>
                <Td><Count value={s.aging} bucket="aging" /></Td>
                <Td><Count value={s.fresh} bucket="fresh" /></Td>
                <Td className="tabular-nums">
                  {s.neverOpened > 0 ? (
                    <span className="font-semibold text-slate-500">{s.neverOpened}</span>
                  ) : (
                    <span className="text-muted-foreground/40">0</span>
                  )}
                </Td>
                <Td className="text-left">
                  <OpenRateBar rate={s.openRate} />
                </Td>
                <Td className="tabular-nums font-semibold">
                  <OldestWait days={s.oldestDaysSinceSent} />
                </Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("border-b border-border/50 px-2 py-2 text-right font-black", className)}>
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-border/30 px-2 py-2.5 text-right align-middle", className)}>
      {children}
    </td>
  )
}

function Count({ value, bucket }: { value: number; bucket: keyof typeof BUCKET_META }) {
  if (value === 0) return <span className="text-muted-foreground/40">0</span>
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 font-bold tabular-nums", BUCKET_META[bucket].chip)}>
      {value}
    </span>
  )
}

function OpenRateBar({ rate }: { rate: number }) {
  const color = rate >= 70 ? "#10b981" : rate >= 40 ? "#f59e0b" : "#ef4444"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: color }} />
      </div>
      <span className="tabular-nums text-xs font-semibold text-foreground">{rate}%</span>
    </div>
  )
}

function OldestWait({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground/40">—</span>
  const tone =
    days >= HANDOFF_THRESHOLDS.overdueDays
      ? "text-red-500"
      : days >= HANDOFF_THRESHOLDS.agingDays
        ? "text-orange-500"
        : "text-foreground"
  return <span className={tone}>{days}d</span>
}
