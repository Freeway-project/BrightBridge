import { Topbar } from "@/components/layout/topbar"
import { OverviewView } from "@/components/super-admin/overview-view"
import { getSuperAdminData } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"
import { redirect } from "next/navigation"
import { TweakableContent } from "@/components/shared/tweakable-content"

export default async function SuperAdminDashboardPage() {
  const context = await getAuthContext()

  if (context.kind !== "profile" || context.profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  const data = await getSuperAdminData()

  return (
    <>
      <Topbar title="System Overview" subtitle="Super Admin" />
      <TweakableContent className="flex-1 overflow-hidden">
        <OverviewView data={data} />
      </TweakableContent>
    </>
  )
}
