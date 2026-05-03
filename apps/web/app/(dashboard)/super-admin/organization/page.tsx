import { Topbar } from "@/components/layout/topbar"
import { getSuperAdminData } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"
import { redirect } from "next/navigation"
import { OrganizationView } from "@/components/super-admin/organization-view"

export default async function SuperAdminOrganizationPage() {
  const context = await getAuthContext()

  if (context.kind !== "profile" || context.profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  const data = await getSuperAdminData()

  return (
    <>
      <Topbar title="Organization" subtitle="Super Admin" backHref="/super-admin" />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <OrganizationView data={data} />
      </div>
    </>
  )
}
