import { Badge } from "@/components/ui/badge"
import { STATUS_BADGE_CLASS } from "@/lib/constants/status"
import { getCourseStatusLabel, type CourseStatus } from "@coursebridge/workflow"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: CourseStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", STATUS_BADGE_CLASS[status], className)}
    >
      {getCourseStatusLabel(status)}
    </Badge>
  )
}
