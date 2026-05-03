import { Topbar } from "@/components/layout/topbar"
import { getPaginatedSuperAdminCourses } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"
import { redirect } from "next/navigation"
import { CoursesView } from "@/components/super-admin/courses-view"

export default async function SuperAdminCoursesPage(props: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const context = await getAuthContext()

  if (context.kind !== "profile" || context.profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  const searchParams = await props.searchParams
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1
  const search = searchParams.search ?? ""

  const paginatedResult = await getPaginatedSuperAdminCourses(page, 20, search)

  return (
    <>
      <Topbar title="All Courses" subtitle="Super Admin" backHref="/super-admin" />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CoursesView result={paginatedResult} search={search} />
      </div>
    </>
  )
}
