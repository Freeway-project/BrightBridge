import { Topbar } from "@/components/layout/topbar"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { requireProfile, requireAnyRole } from "@/lib/auth/context"
import { ContentConverter } from "./_components/converter"

// TAs and full Admins (plus Super Admins) can use the converter.
const ALLOWED_ROLES = ["standard_user", "admin_full", "super_admin"] as const

export default async function ContentConverterPage() {
  const context = await requireProfile()
  requireAnyRole(context, ALLOWED_ROLES)

  return (
    <>
      <Topbar
        title="Content Converter"
        subtitle="Turn a PDF or Word document into a Brightspace-ready HTML page"
      />
      <TweakableContent className="flex-1 overflow-y-auto p-6 bg-background">
        <div className="mx-auto max-w-6xl">
          <ContentConverter />
        </div>
      </TweakableContent>
    </>
  )
}
