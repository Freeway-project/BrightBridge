import { requireProfile } from "@/lib/auth/context"
import { getAssignedCourses } from "@/lib/services/courses"
import { TADashboardClient } from "./_components/ta-dashboard-client"

export default async function TADashboardPage() {
  const ctx = await requireProfile()
  const courses = await getAssignedCourses(ctx.userId)

  return <TADashboardClient courses={courses} />
}
