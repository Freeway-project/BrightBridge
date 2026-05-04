import { cn } from "@/lib/utils"
import { getCourseStatusLabel, type CourseStatus } from "@coursebridge/workflow"

interface StatusBadgeProps {
  status: CourseStatus
  className?: string
}

const DOT_COLORS: Record<CourseStatus, string> = {
  // Migration
  course_created:          "bg-slate-400",
  assigned_to_ta:          "bg-slate-400",
  // Staging (blue; orange where admin action is blocked on someone)
  ta_review_in_progress:   "bg-blue-500",
  submitted_to_admin:      "bg-blue-500",
  admin_changes_requested: "bg-orange-500",
  ready_for_instructor:    "bg-blue-500",
  sent_to_instructor:      "bg-blue-500",
  instructor_questions:    "bg-orange-500",
  instructor_approved:     "bg-blue-500",
  // Provision
  final_approved:          "bg-emerald-500",
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("size-1.5 rounded-full", DOT_COLORS[status])} />
      <span className="text-sm text-foreground/80">
        {getCourseStatusLabel(status)}
      </span>
    </div>
  )
}
