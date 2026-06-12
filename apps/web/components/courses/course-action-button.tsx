import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TA_COURSE_ACTIONS } from "@/lib/constants/status"
import type { CourseRow } from "@/lib/services/courses"

interface CourseActionButtonProps {
  status: CourseRow["status"]
  courseId: string
}

export function CourseActionButton({ status, courseId }: CourseActionButtonProps) {
  const action = TA_COURSE_ACTIONS[status]
  if (!action) return null

  const href = action.href ? `/courses/${courseId}/${action.href}` : `/courses/${courseId}`
  return (
    <Button variant={action.variant} size="sm" asChild>
      <Link href={href}>{action.label}</Link>
    </Button>
  )
}
