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
