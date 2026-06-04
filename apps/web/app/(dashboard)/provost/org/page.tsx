import { redirect } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { OrganizationView } from "@/components/super-admin/organization-view"
import { getSuperAdminData } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"

// Org-chart management for the provost: create units, assign/remove deans and
// department heads. Backed by the same server actions as the super-admin org tab
// (guarded by requireOrgManager, which allows provost + super_admin).
export default async function ProvostOrganizationPage() {
  const context = await getAuthContext()

  if (
    context.kind !== "profile" ||
    (context.profile.role !== "provost" && context.profile.role !== "super_admin")
  ) {
    redirect("/dashboard")
  }

  const data = await getSuperAdminData()

  return (
    <>
      <Topbar title="Organization" subtitle="Manage colleges, departments, and leadership" />
      <div className="min-w-0 flex-1 overflow-hidden flex flex-col bg-background">
        <OrganizationView data={data} />
      </div>
    </>
  )
}
