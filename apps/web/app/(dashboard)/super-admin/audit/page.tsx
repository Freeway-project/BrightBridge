import { Topbar } from "@/components/layout/topbar"
import { getSuperAdminData } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"
import { redirect } from "next/navigation"
import { AuditView } from "@/components/super-admin/audit-view"

export default async function SuperAdminAuditPage() {
  const context = await getAuthContext()

  if (context.kind !== "profile" || context.profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  const data = await getSuperAdminData()

  return (
    <>
      <Topbar title="Audit Trail" subtitle="Super Admin" />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <AuditView data={data} />
      </div>
    </>
  )
}
