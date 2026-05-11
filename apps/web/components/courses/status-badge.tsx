import { cn } from "@/lib/utils"
import { getCourseStatusLabel, type CourseStatus } from "@coursebridge/workflow"
import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status: CourseStatus
  className?: string
}

const STATUS_VARIANTS: Record<CourseStatus, "default" | "secondary" | "success" | "warning" | "info"> = {
  // Migration
  course_created:          "secondary",
  assigned_to_ta:          "secondary",
  // Staging
  ta_review_in_progress:   "info",
  submitted_to_admin:      "info",
  admin_changes_requested: "warning",
  ready_for_instructor:    "info",
  sent_to_instructor:      "info",
  instructor_questions:    "warning",
  instructor_approved:     "info",
  // Provision
  final_approved:          "success",
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className={cn("px-2 py-0.5 rounded-full uppercase text-[10px] font-bold tracking-wider", className)}>
      {getCourseStatusLabel(status)}
    </Badge>
  )
}
