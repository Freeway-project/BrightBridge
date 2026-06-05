import { redirect } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { OverviewView } from "@/components/super-admin/overview-view"
import { getSuperAdminData } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"

// Provost = institution-wide oversight. Sees every college, dean, department,
// and course across the institution (global all-access, no org-unit membership).
// The leadership roster (deans, dept-heads) lives on the Organization page.
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
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background">
        <OverviewView data={data} />
      </div>
    </>
  )
}
