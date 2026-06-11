import { getBallInCourt, type CourseStatus } from "@coursebridge/workflow"
import { cn } from "@/lib/utils"

interface TurnIndicatorProps {
  status: CourseStatus
  /** Whose perspective we render from. Defaults to staff (TA dashboards). */
  viewer?: "staff" | "admin" | "instructor"
  className?: string
}

/**
 * Ball-in-court signal, separate from the status label. Tells the viewer
 * whether it's their turn or whom they're waiting on. Minimal styling — final
 * appearance is refined via the Gemini visual pass.
 */
export function TurnIndicator({ status, viewer = "staff", className }: TurnIndicatorProps) {
  const owner = getBallInCourt(status)

  let label: string
  let dot: string
  if (owner === "done") {
    label = "Done"
    dot = "bg-emerald-500"
  } else if (owner === viewer) {
    label = "Your turn"
    dot = "bg-blue-500"
  } else if (owner === "admin") {
    label = "Waiting on Admin"
    dot = "bg-muted-foreground/50"
  } else if (owner === "instructor") {
    label = "Waiting on Instructor"
    dot = "bg-muted-foreground/50"
  } else {
    label = "Waiting on Staff"
    dot = "bg-muted-foreground/50"
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("size-2 rounded-full", dot)} />
      <span className="text-xs font-semibold text-foreground/90">{label}</span>
    </div>
  )
}
