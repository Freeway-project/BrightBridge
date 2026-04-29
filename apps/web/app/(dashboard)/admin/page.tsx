import { Topbar } from "@/components/layout/topbar"
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
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAccessibleCourses } from "@/lib/courses/service"
import { getProfilesByRole } from "@/lib/services/profiles"
import { AdminAssignmentPanel } from "./_components/admin-assignment-panel"

export default async function AdminDashboardPage() {
  const context = await requireProfile()
  requireAnyRole(context, ["admin", "super_admin"])

  const [{ courses }, tas] = await Promise.all([
    getAccessibleCourses(),
    getProfilesByRole("ta"),
  ])
  const assignableCourses = courses.filter((course) =>
    ["course_created", "assigned_to_ta", "admin_changes_requested"].includes(course.status),
  )

  return (
    <>
      <Topbar title="Admin Review" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <AdminAssignmentPanel courses={assignableCourses} tas={tas} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course Queue</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-xs">Course</TableHead>
                  <TableHead className="text-xs">Term</TableHead>
                  <TableHead className="text-xs">Department</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="pr-4 text-right text-xs">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="py-8 text-center text-sm text-muted-foreground"
                      colSpan={5}
                    >
                      No courses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="pl-4 text-sm font-medium">{course.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {course.term ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {course.department ?? "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={course.status} />
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
      </main>
    </>
  )
}
