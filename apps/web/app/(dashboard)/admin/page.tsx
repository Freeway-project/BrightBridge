import { Topbar } from "@/components/layout/topbar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourses } from "@/lib/admin/queries"
import { getProfilesByRole } from "@/lib/services/profiles"
import { AdminAssignmentPanel } from "./_components/admin-assignment-panel"
import { AssignedCoursesTable } from "./_components/assigned-courses-table"
import { ReviewQueueTable } from "./_components/review-queue-table"

export default async function AdminDashboardPage() {
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  const [courses, tas] = await Promise.all([
    getAdminCourses(),
    getProfilesByRole("standard_user"),
  ])

  const unassigned = courses.filter((c) => c.status === "course_created")
  const assigned = courses.filter((c) => c.ta !== null)
  const queue = courses.filter((c) => c.status === "submitted_to_admin")

  return (
    <>
      <Topbar title="Admin" subtitle="Manage staff assignments and review submissions" />
      <Tabs defaultValue="assignments" className="flex flex-col flex-1 min-h-0">
        <div className="border-b border-border px-6 pt-2">
          <TabsList className="h-9 bg-transparent p-0 gap-1">
            {[
              { value: "assignments", label: "Assignments" },
              { value: "queue", label: "Review Queue", count: queue.length },
            ].map(({ value, label, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none border-b-2 border-transparent px-3 pb-2 pt-1 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
              >
                {label}
                {count != null && count > 0 && (
                  <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="assignments" className="flex-1 overflow-y-auto p-6 mt-0 space-y-6">
          <AdminAssignmentPanel courses={unassigned} tas={tas} />
          <AssignedCoursesTable courses={assigned} />
        </TabsContent>

        <TabsContent value="queue" className="flex-1 overflow-y-auto p-6 mt-0">
          <ReviewQueueTable courses={queue} />
        </TabsContent>
      </Tabs>
    </>
  )
}
