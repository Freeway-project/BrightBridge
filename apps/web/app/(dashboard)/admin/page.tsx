import { Topbar } from "@/components/layout/topbar"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourses } from "@/lib/admin/queries"
import { getProfilesByRole } from "@/lib/services/profiles"
import { AdminAssignmentPanel } from "./_components/admin-assignment-panel"
import { AssignedCoursesTable } from "./_components/assigned-courses-table"

export default async function AdminDashboardPage() {
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  const [courses, tas] = await Promise.all([
    getAdminCourses(),
    getProfilesByRole("standard_user"),
  ])

  const unassigned = courses.filter((c) => c.status === "course_created")
  const assigned = courses.filter((c) => c.ta !== null)

  return (
    <>
      <Topbar title="Assignments" subtitle="Manage staff assignments for new courses" />
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6 bg-background">
        <AdminAssignmentPanel courses={unassigned} tas={tas} />
        <AssignedCoursesTable courses={assigned} />
      </div>
    </>
  )
}
