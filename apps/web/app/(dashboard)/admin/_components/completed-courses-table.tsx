import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import type { AdminCourseRow } from "@/lib/admin/queries"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

interface Props {
  courses: AdminCourseRow[]
}

export function CompletedCoursesTable({ courses }: Props) {
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <p className="text-sm font-medium">No completed courses yet</p>
        <p className="text-xs">Courses appear here once final approval is granted.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">TA</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source ID</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target ID</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approved</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {courses.map((course) => (
            <tr key={course.id} className="bg-card hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{course.title}</p>
                {course.department && (
                  <p className="text-[11px] text-muted-foreground">{course.department}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {course.ta?.name ?? course.ta?.email ?? "—"}
                </p>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-mono text-muted-foreground">{course.sourceCourseId ?? "—"}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-mono text-muted-foreground">{course.targetCourseId ?? "—"}</p>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(course.updatedAt), { addSuffix: true })}
                </p>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" asChild>
                    <Link href={`/admin/courses/${course.id}`}>
                      <ExternalLink className="size-3" />
                      View
                    </Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
