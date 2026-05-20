import { Topbar } from "@/components/layout/topbar"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { MigrationPanel } from "@/app/(dashboard)/admin/_components/migration-panel"
import { getLatestMigrationReport } from "@/lib/migration/report"

export default async function MigrationPage() {
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])
  const report = await getLatestMigrationReport()

  return (
    <>
      <Topbar title="Migration" subtitle="What changed, what failed, and what needs follow-up" role={context.profile.role} />
      <TweakableContent className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-background">
        <MigrationPanel report={report} />
      </TweakableContent>
    </>
  )
}
