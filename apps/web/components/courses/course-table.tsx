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
import type { MockCourse } from "@/lib/mock/courses"

interface CourseTableProps {
  courses: MockCourse[]
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
          <TableHead className="text-xs font-medium text-muted-foreground w-[100px]">Code</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground">Title</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[110px]">Term</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[60px]">Sec.</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[180px]">Status</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[100px]">Assigned</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[90px]">Time Spent</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[70px] text-center">Issues</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground w-[120px] text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => (
          <TableRow key={course.id} className="border-border">
            <TableCell className="font-mono text-xs font-medium">{course.code}</TableCell>
            <TableCell className="text-sm">{course.title}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{course.term}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{course.section}</TableCell>
            <TableCell>
              <StatusBadge status={course.status} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(course.assignedDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{course.timeSpent}</TableCell>
            <TableCell className="text-center">
              {course.issueCount > 0 ? (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-destructive/15 text-[10px] font-semibold text-destructive">
                  {course.issueCount}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
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
