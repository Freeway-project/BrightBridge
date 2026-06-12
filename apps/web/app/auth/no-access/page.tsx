import { OCLoadingLogo } from "@/components/shared/oc-loading-logo"
import { Button } from "@/components/ui/button"
import { getAuthService } from "@/lib/auth/service"
import { signOutAction } from "./actions"

export default async function NoAccessPage() {
  const user = await getAuthService().getCurrentSessionUser()
  const email = user?.email ?? null

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card px-6 py-8 shadow-sm">
        <div className="flex items-center gap-2">
          <OCLoadingLogo className="size-10 shrink-0" />
          <span className="text-lg font-semibold">CourseBridge</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">No CourseBridge access</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {email ? `The account ${email}` : "Your account"} does not have a CourseBridge
            profile or role assigned yet.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ask a super admin to create your account and assign you a role, then sign in again.
          </p>
        </div>

        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="w-full h-10">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  )
}
