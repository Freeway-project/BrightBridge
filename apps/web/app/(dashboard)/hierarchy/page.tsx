import { redirect } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { HierarchyChart } from "@/components/super-admin/hierarchy-chart"
import { getSuperAdminData, buildOrgTree } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"

// Institution-wide org chart, surfaced as its own sidebar route for everyone
// with cross-unit oversight (admin, provost, super-admin). Shows every college,
// school, and department with leadership (deans, dept-heads, …) ordered and
// color-coded by role. Read access is broad; node-detail/management are gated
// server-side (getUnitDetail / requireOrgManager).
export default async function HierarchyPage() {
  const context = await getAuthContext()

  if (
    context.kind !== "profile" ||
    (context.profile.role !== "admin_full" &&
      context.profile.role !== "provost" &&
      context.profile.role !== "super_admin")
  ) {
    redirect("/dashboard")
  }

  const data = await getSuperAdminData()

  return (
    <>
      <Topbar title="Hierarchy" subtitle="Institution org chart — deans, department heads, and units" />
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background p-4 sm:p-6">
        <HierarchyChart tree={buildOrgTree(data)} />
      </div>
    </>
  )
}
