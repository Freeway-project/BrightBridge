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

  return (
    <Button variant={action.variant} size="sm" asChild>
      <Link href={`/courses/${courseId}/metadata`}>{action.label}</Link>
    </Button>
  )
}
