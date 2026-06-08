import { redirect } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { ProvostDashboard } from "@/components/provost/provost-dashboard"
import { getSuperAdminData } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"

// Provost = institution-wide oversight. Sees every college, dean, department,
// and course across the institution (global all-access, no org-unit membership).
// This is the executive dashboard: welcome banner, hero KPIs, status breakdown,
// at-risk courses, and the institution-wide "who did what" activity feed. Org/
// leadership management lives on the Organization page; the org chart on /hierarchy.
export default async function ProvostOverviewPage() {
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
      <Topbar title="Provost Overview" subtitle="Institution-wide review status" />
      <ProvostDashboard data={data} provostName={context.profile.fullName} />
    </>
  )
}
