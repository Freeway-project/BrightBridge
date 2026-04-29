"use client"

import { useState, useTransition } from "react"
import { getRoleLabel, ROLES } from "@coursebridge/workflow"
import { signInAsDevRole, sendOTP, verifyOTP } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, CheckCircle2, GitMerge, Users, FileCheck, Mail, Lock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const FEATURES = [
  {
    icon: GitMerge,
    title: "Structured migration reviews",
    desc: "Step-by-step TA checklists for every Moodle → Brightspace course.",
  },
  {
    icon: Users,
    title: "Multi-role workflow",
    desc: "TAs, Admins, Instructors, and Comm Dept each see exactly what they need.",
  },
  {
    icon: FileCheck,
    title: "Full audit trail",
    desc: "Every status change, comment, and approval is tracked end-to-end.",
  },
]

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    startTransition(async () => {
      const result = await sendOTP(email)
      if (result.error) {
        setError(result.error)
      } else {
        setStep("otp")
      }
    })
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await verifyOTP(email, otp)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  return (
    <main className="min-h-screen bg-background flex">
      {/* ── Left branding panel ── */}
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
              Course migration,<br />
              <span className="text-primary">done right.</span>
            </h1>
            <p className="text-base text-sidebar-foreground/60 leading-relaxed max-w-sm">
              The internal review platform that keeps every Moodle → Brightspace migration on track.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <f.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground">{f.title}</p>
                  <p className="text-xs text-sidebar-foreground/50 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/30">
          © {new Date().getFullYear()} CourseBridge. Internal platform.
        </p>
      </div>

      {/* ── Right sign-in panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {step === "email" ? "Welcome back" : "Confirm your identity"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step === "email" 
                ? "Enter your institutional email to receive a 6-digit code." 
                : `We've sent a code to ${email}. Enter it below to sign in.`}
            </p>
          </div>

          <div className="relative overflow-hidden">
            {/* Step 1: Email */}
            <div className={cn(
              "transition-all duration-300 ease-in-out",
              step === "otp" ? "-translate-x-full opacity-0 pointer-events-none absolute w-full" : "translate-x-0 opacity-100"
            )}>
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="email">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="email"
                      placeholder="you@institution.edu"
                      required
                      type="email"
                      className="h-10 pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <Button className="w-full h-10 gap-2" type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : "Send code"}
                  {!isPending && <ArrowRight className="size-4" />}
                </Button>
              </form>
            </div>

            {/* Step 2: OTP */}
            <div className={cn(
              "transition-all duration-300 ease-in-out",
              step === "email" ? "translate-x-full opacity-0 pointer-events-none absolute w-full" : "translate-x-0 opacity-100"
            )}>
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="otp">Verification code</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      placeholder="000000"
                      required
                      maxLength={6}
                      className="h-10 pl-10 tracking-[0.5em] font-mono text-lg"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>
                <Button className="w-full h-10 gap-2" type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : "Verify & Sign in"}
                </Button>
                <button 
                  type="button" 
                  onClick={() => setStep("email")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors block mx-auto"
                >
                  Didn't get a code? Try again
                </button>
              </form>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5">
              <span className="mt-0.5 text-destructive text-sm">⚠</span>
              <p className="text-sm text-destructive leading-tight">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Dev quick-login */}
          {process.env.NODE_ENV === "development" && (
            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-foreground">Dev quick login</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bypasses email — dev environment only.</p>
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
