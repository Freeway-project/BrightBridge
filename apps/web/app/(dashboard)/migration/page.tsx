import { Topbar } from "@/components/layout/topbar"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { MigrationPanel } from "@/app/(dashboard)/admin/_components/migration-panel"

export default async function MigrationPage() {
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  return (
    <>
      <Topbar title="Migration" subtitle="What changed, what failed, and what needs follow-up" />
      <TweakableContent className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-background">
        <MigrationPanel />
      </TweakableContent>
    </>
  )
}

