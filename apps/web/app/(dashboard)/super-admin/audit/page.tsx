import { Topbar } from "@/components/layout/topbar"
import { getPaginatedAuditEvents } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"
import { redirect } from "next/navigation"
import { AuditView } from "@/components/super-admin/audit-view"
import { TweakableContent } from "@/components/shared/tweakable-content"

const AUDIT_PAGE_SIZE = 30

// Always render fresh — never serve a cached audit trail.
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SuperAdminAuditPage() {
  const context = await getAuthContext()

  if (context.kind !== "profile" || context.profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  // Seed the first page only; the view pulls further pages on scroll.
  const initial = await getPaginatedAuditEvents(1, AUDIT_PAGE_SIZE)

  return (
    <>
      <Topbar title="Audit Trail" subtitle="Super Admin" backHref="/super-admin" />
      <TweakableContent className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <AuditView initial={initial} />
      </TweakableContent>
    </>
  )
}
