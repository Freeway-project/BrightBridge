import { Topbar } from "@/components/layout/topbar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourses } from "@/lib/admin/queries"
import { getProfilesByRole } from "@/lib/services/profiles"
import { AdminAssignmentPanel } from "./_components/admin-assignment-panel"
import { AssignedCoursesTable } from "./_components/assigned-courses-table"
import { ReviewQueueTable } from "./_components/review-queue-table"
import { ClipboardList, Clock } from "lucide-react"

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

  const TABS = [
    { value: "assignments", label: "Assignments", icon: ClipboardList },
    { value: "queue", label: "Review Queue", icon: Clock, count: queue.length },
  ]

  return (
    <>
      <Topbar title="Admin" subtitle="Manage staff assignments and review submissions" />
      <Tabs defaultValue="assignments" orientation="vertical" className="flex flex-row flex-1 min-h-0">
        <aside className="w-64 border-r border-border bg-muted/5 flex flex-col shrink-0">
          <div className="p-4 border-b border-border bg-muted/10">
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Admin Control</h2>
          </div>
          <TabsList className="flex flex-col h-auto bg-transparent p-2 gap-1 items-stretch">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="justify-start gap-2.5 rounded-md px-3 py-2 text-sm transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-medium hover:bg-muted/50"
              >
                <tab.icon className="size-4 shrink-0" />
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.count != null && tab.count > 0 && (
                  <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                    {tab.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </aside>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
          <TabsContent value="assignments" className="flex-1 overflow-y-auto p-6 mt-0 space-y-6">
            <AdminAssignmentPanel courses={unassigned} tas={tas} />
            <AssignedCoursesTable courses={assigned} />
          </TabsContent>

          <TabsContent value="queue" className="flex-1 overflow-y-auto p-6 mt-0">
            <ReviewQueueTable courses={queue} />
          </TabsContent>
        </div>
      </Tabs>
    </>
  )
}

