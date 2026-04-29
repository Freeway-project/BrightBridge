"use client"

import { useRouter } from "next/navigation"
import type { AdminCourseRow } from "@/lib/admin/queries"
import { StatusBadge } from "@/components/courses/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type Props = { courses: AdminCourseRow[] }

export function AssignedCoursesTable({ courses }: Props) {
  const router = useRouter()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Assigned Courses
          <span className="ml-2 text-sm font-normal text-muted-foreground">({courses.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 text-xs">Course</TableHead>
              <TableHead className="text-xs">TA</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Progress</TableHead>
              <TableHead className="pr-4 text-right text-xs">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-sm text-muted-foreground" colSpan={5}>
                  No courses assigned yet.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow
                  key={course.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/courses/${course.id}`)}
                >
                  <TableCell className="pl-4">
                    <p className="text-sm font-medium">{course.title}</p>
                    {course.sourceCourseId && (
                      <p className="text-xs text-muted-foreground">{course.sourceCourseId}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {course.ta ? (
                      <>
                        <p className="text-sm">{course.ta.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{course.ta.email}</p>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={course.status} />
                  </TableCell>
                  <TableCell>
                    <ProgressPills progress={course.reviewProgress} />
                  </TableCell>
                  <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                    {new Date(course.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ProgressPills({ progress }: { progress: AdminCourseRow["reviewProgress"] }) {
  const pills = [
    { label: "Meta", section: progress?.courseMetadata },
    { label: "Checklist", section: progress?.reviewMatrix },
    { label: "Syllabus", section: progress?.syllabusReview },
  ]

  return (
    <div className="flex items-center gap-1">
      {pills.map(({ label, section }) => {
        const color = !section?.exists
          ? "bg-muted text-muted-foreground"
          : section.status === "submitted"
          ? "bg-green-500/15 text-green-700 dark:text-green-400"
          : "bg-orange-500/15 text-orange-700 dark:text-orange-400"

        return (
          <span
            key={label}
            className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", color)}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}
