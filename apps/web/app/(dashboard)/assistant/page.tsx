import { redirect } from "next/navigation"
import { AssistantPanel } from "@/components/assistant/assistant-panel"
import { Topbar } from "@/components/layout/topbar"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { getAuthContext } from "@/lib/auth/context"
import { canAccessAssistant } from "@/lib/assistant/authz"

export default async function AssistantPage() {
  const context = await getAuthContext()

  if (context.kind !== "profile" || !canAccessAssistant(context.profile)) {
    redirect("/dashboard")
  }

  return (
    <>
      <Topbar title="Analytics Assistant" subtitle="Open-ended leadership questions over read-only operational data" />
      <TweakableContent className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <AssistantPanel />
        </div>
      </TweakableContent>
    </>
  )
}
