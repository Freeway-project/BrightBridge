"use client"

import { useActionState } from "react"
import { getRoleLabel, ROLES } from "@coursebridge/workflow"
import { signInAsDevRole, signInWithPasswordAction, type ActionState } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileCheck, GitMerge, KeyRound, Lock, Mail, Users } from "lucide-react"

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

const initialState: ActionState = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInWithPasswordAction, initialState)

  return (
    <main className="min-h-screen bg-background flex">
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-sidebar border-r border-sidebar-border px-12 py-14">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            CB
          </div>
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
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use the account created for you by a CourseBridge super admin.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="email">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  placeholder="you@institution.edu"
                  required
                  type="email"
                  className="h-10 pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  required
                  type="password"
                  className="h-10 pl-10"
                />
              </div>
            </div>

            <Button className="w-full h-10 gap-2" type="submit" disabled={pending}>
              <KeyRound className="size-4" />
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {state.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5">
              <p className="text-sm text-destructive leading-tight">{state.error}</p>
            </div>
          ) : null}

          <div className="rounded-lg border border-dashed border-border px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Need access? Ask a super admin to create your account and assign your role.
            </p>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-foreground">Dev quick login</p>
                <p className="text-xs text-muted-foreground mt-0.5">Uses seeded password accounts in development.</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {ROLES.map((role) => (
                  <form action={signInAsDevRole} key={role}>
                    <input name="role" type="hidden" value={role} />
                    <Button className="w-full text-[11px] h-8" size="sm" type="submit" variant="outline">
                      {getRoleLabel(role)}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
