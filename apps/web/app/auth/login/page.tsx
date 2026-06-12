"use client"

import { useActionState } from "react"
import { FileCheck, GitMerge, Users } from "lucide-react"
import { signInAction } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OCLoadingLogo } from "@/components/shared/oc-loading-logo"

const DEV_LOGIN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "1"

const DEV_ROLES = [
  "super_admin",
  "provost",
  "admin_full",
  "admin_viewer",
  "standard_user",
  "instructor",
] as const

const FEATURES = [
  {
    icon: GitMerge,
    title: "Structured migration reviews",
    desc: "Step-by-step TA checklists for every Moodle -> Brightspace course.",
  },
  {
    icon: Users,
    title: "Controlled role access",
    desc: "Super admins manage account creation and role changes centrally.",
  },
  {
    icon: FileCheck,
    title: "Full audit trail",
    desc: "Every workflow handoff and decision stays tied to the course record.",
  },
]

function DevLoginPanel() {
  return (
    <form
      action="/auth/dev/login"
      method="POST"
      className="mt-6 space-y-3 rounded-md border border-dashed border-amber-400/60 bg-amber-50/40 p-4 dark:bg-amber-950/20"
    >
      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
        Dev sign-in (local only)
      </p>
      <Input
        name="email"
        type="email"
        required
        placeholder="email of an existing profile"
        className="w-full"
      />
      <select
        name="role"
        defaultValue="super_admin"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {DEV_ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" className="w-full h-9 text-sm">
        Sign in as dev user
      </Button>
    </form>
  )
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInAction, {})

  return (
    <main className="min-h-screen bg-background flex">
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-sidebar border-r border-sidebar-border px-12 py-14">
        <div className="flex items-center gap-1">
          <OCLoadingLogo className="size-12 shrink-0" />
          <span className="text-lg font-semibold text-sidebar-foreground">CourseBridge</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight text-sidebar-foreground">
              Course migration,
              <br />
              <span className="text-primary">done right.</span>
            </h1>
            <p className="text-base text-sidebar-foreground/60 leading-relaxed max-w-sm">
              Internal review workspace for moving Moodle courses into Brightspace with clear ownership and staged approval.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <feature.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground">{feature.title}</p>
                  <p className="text-xs text-sidebar-foreground/50 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/30">
          © {new Date().getFullYear()} CourseBridge. Internal platform.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Use your CourseBridge account credentials.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button className="w-full h-10" type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="rounded-lg border border-dashed border-border px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Need access? Ask a super admin to create your account.
            </p>
          </div>

          {DEV_LOGIN_ENABLED && <DevLoginPanel />}
        </div>
      </div>
    </main>
  )
}
