import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "./status-badge"
import { CourseActionButton } from "./course-action-button"
import type { CourseRow } from "@/lib/services/courses"
import { cn } from "@/lib/utils"

interface CourseTableProps {
  courses: CourseRow[]
}

export function CourseTable({ courses }: CourseTableProps) {
  if (courses.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        No courses match your filters.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-xs font-medium text-muted-foreground">Title</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[110px]">Term</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[140px]">Department</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[190px]">Status</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[140px]">Next Step</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[100px]">Assigned</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[120px] text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => (
          <TableRow key={course.id} className="border-border">
            <TableCell className="text-sm font-medium">{course.title}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{course.term ?? "—"}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{course.department ?? "—"}</TableCell>
            <TableCell>
              <StatusBadge status={course.status} />
            </TableCell>
            <TableCell>
              <NextStepBadge course={course} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(course.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </TableCell>
            <TableCell className="text-right">
              <CourseActionButton status={course.status} courseId={course.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function NextStepBadge({ course }: { course: CourseRow }) {
  const { status, reviewProgress } = course

  let label = "In Progress"
  let classes = "bg-muted text-muted-foreground"

  if (status === "admin_changes_requested") {
    label = "Fix Requested"
    classes = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  } else if (
    [
      "submitted_to_admin",
      "ready_for_instructor",
      "sent_to_instructor",
      "instructor_questions",
      "instructor_approved",
      "final_approved",
    ].includes(status)
  ) {
    label = "Waiting on Admin"
    classes = "bg-muted text-muted-foreground"
  } else if (!reviewProgress?.courseMetadata?.exists) {
    label = "Fill Metadata"
    classes = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  } else if (!reviewProgress?.reviewMatrix?.exists) {
    label = "Fill Checklist"
    classes = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  } else if (!reviewProgress?.syllabusReview?.exists) {
    label = "Fill Syllabus"
    classes = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  } else if (
    reviewProgress?.courseMetadata?.exists &&
    reviewProgress?.reviewMatrix?.exists &&
    reviewProgress?.syllabusReview?.exists
  ) {
    label = "Ready to Submit"
    classes = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  }

  return (
    <div
      className={cn(
        "w-[130px] truncate rounded-full px-2 py-0.5 text-center text-[11px] font-semibold",
        classes
      )}
    >
      {label}
    </div>
  )
}
