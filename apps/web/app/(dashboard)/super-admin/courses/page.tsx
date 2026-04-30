import { Topbar } from "@/components/layout/topbar"
import { getSuperAdminData } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"
import { redirect } from "next/navigation"
import { CoursesView } from "@/components/super-admin/courses-view"

export default async function SuperAdminCoursesPage() {
  const context = await getAuthContext()

  if (context.kind !== "profile" || context.profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  const data = await getSuperAdminData()

  return (
    <>
      <Topbar title="All Courses" subtitle="Super Admin" />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CoursesView data={data} />
      </div>
    </>
  )
}
