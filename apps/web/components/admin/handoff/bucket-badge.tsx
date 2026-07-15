import { cn } from "@/lib/utils"
import type { HandoffBucket } from "@/lib/admin/handoff-buckets"

/**
 * Presentation metadata for each staleness bucket. `chip` reuses the
 * `bg-*-500/10 text-*-500` convention from StuckCoursesList; `accent` is the hex
 * used by StatCard's coloured value/bar.
 */
export const BUCKET_META: Record<
  HandoffBucket,
  { label: string; range: string; description: string; chip: string; accent: string; dot: string }
> = {
  overdue: {
    label: "Overdue",
    range: "7+ days",
    description: "Sent 7+ days ago and still not approved — likely needs a nudge.",
    chip: "bg-red-500/10 text-red-500",
    accent: "#ef4444",
    dot: "bg-red-500",
  },
  aging: {
    label: "Aging",
    range: "3–6 days",
    description: "Sent 3–6 days ago — watch these before they slip into overdue.",
    chip: "bg-orange-500/10 text-orange-500",
    accent: "#f59e0b",
    dot: "bg-orange-500",
  },
  fresh: {
    label: "Fresh",
    range: "< 3 days",
    description: "Sent in the last 3 days — still within a normal review window.",
    chip: "bg-emerald-500/10 text-emerald-500",
    accent: "#10b981",
    dot: "bg-emerald-500",
  },
}

/** Buckets in display priority order (most urgent first). */
export const BUCKET_ORDER: HandoffBucket[] = ["overdue", "aging", "fresh"]

interface BucketBadgeProps {
  bucket: HandoffBucket
  /** Whole days since sent; when provided, shows "{n}d" instead of the label. */
  days?: number | null
  className?: string
}

export function BucketBadge({ bucket, days, className }: BucketBadgeProps) {
  const meta = BUCKET_META[bucket]
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider",
        meta.chip,
        className,
      )}
      title={`${meta.label} · ${meta.range}`}
    >
      {typeof days === "number" ? `${days}d` : meta.label}
    </span>
  )
}
