import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface Props {
  openedAt: string | null | undefined
  /** Tighten layout when used inline with text. */
  size?: "sm" | "md"
  className?: string
}

/**
 * Tiny status dot showing whether the instructor has opened the course
 * dashboard. Decoupled from workflow status — driven purely by the
 * instructor_dashboard_views log. Title attribute is the tooltip.
 */
export function OpenedDot({ openedAt, size = "md", className }: Props) {
  const dim = size === "sm" ? "size-1.5" : "size-2"

  if (!openedAt) {
    return (
      <span
        title="Instructor has not opened the course dashboard yet"
        aria-label="Not opened"
        className={cn(
          "inline-block rounded-full border border-muted-foreground/40 bg-transparent align-middle",
          dim,
          className,
        )}
      />
    )
  }

  const relative = formatDistanceToNow(new Date(openedAt), { addSuffix: true })
  return (
    <span
      title={`Instructor opened ${relative}`}
      aria-label={`Opened ${relative}`}
      className={cn(
        "inline-block rounded-full bg-emerald-500 align-middle",
        dim,
        className,
      )}
    />
  )
}
