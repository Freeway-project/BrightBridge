import { Topbar } from "@/components/layout/topbar"
import { getPaginatedUsers } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"
import { redirect } from "next/navigation"
import { UsersView } from "@/components/super-admin/users-view"

export default async function SuperAdminUsersPage(props: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const context = await getAuthContext()

  if (context.kind !== "profile" || context.profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  const searchParams = await props.searchParams
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1
  const search = searchParams.search ?? ""

  const paginatedResult = await getPaginatedUsers(page, 20, search)

  return (
    <>
      <Topbar title="User Management" subtitle="Super Admin" />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <UsersView result={paginatedResult} search={search} />
      </div>
    </>
  )
}
