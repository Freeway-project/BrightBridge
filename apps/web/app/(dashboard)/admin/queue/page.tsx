import { Topbar } from "@/components/layout/topbar"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourses } from "@/lib/admin/queries"
import { ReviewQueueTable } from "../_components/review-queue-table"

export default async function AdminQueuePage() {
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  const courses = await getAdminCourses()
  const queue = courses.filter((c) => c.status === "submitted_to_admin")

  return (
    <>
      <Topbar 
        title="Review Queue" 
        subtitle="Courses awaiting admin approval" 
        backHref="/admin"
      />
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-6 bg-background">
        <ReviewQueueTable courses={queue} />
      </div>
    </>
  )
}
