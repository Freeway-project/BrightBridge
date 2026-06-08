"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { DEV_ACCOUNTS } from "./dev-accounts"
import { signInAsDevEmail, signInWithPasswordAction, startAzureOidcSignInAction, type ActionState } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnimatedBubbleParticles } from "@/components/ui/animated-bubble-particles"
import { FileCheck, GitMerge, KeyRound, Lock, Mail, Users } from "lucide-react"

// ── Colours that cycle during the sign-in bubble overlay ──────────────────────
const BUBBLE_COLORS = [
  "#818cf8", // violet
  "#ec4899", // pink
  "#34d399", // emerald
  "#f59e0b", // amber
  "#38bdf8", // sky
  "#a78bfa", // purple
  "#fb7185", // rose
]

// ── Feature list ──────────────────────────────────────────────────────────────
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

// ── Bubble overlay that auto-dismisses after 5 s ──────────────────────────────
function SigningInOverlay({ visible }: { visible: boolean }) {
  const [colorIndex, setColorIndex] = useState(0)
  const [dots, setDots] = useState(".")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dotsRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!visible) return

    // Cycle bubble colour every 800 ms
    timerRef.current = setInterval(() => {
      setColorIndex((i) => (i + 1) % BUBBLE_COLORS.length)
    }, 800)

    // Animate ellipsis
    dotsRef.current = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."))
    }, 400)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (dotsRef.current) clearInterval(dotsRef.current)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-live="polite"
      aria-label="Signing in, please wait"
    >
      <AnimatedBubbleParticles
        particleColor={BUBBLE_COLORS[colorIndex]}
        particleSize={36}
        spawnInterval={140}
        blurStrength={14}
        enableGooEffect
        width="100vw"
        height="100vh"
        className="bg-black/70 backdrop-blur-sm"
        zIndex={50}
      >
        {/* Centre label */}
        <div className="flex flex-col items-center gap-4 select-none">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-xl"
            style={{ background: BUBBLE_COLORS[colorIndex], transition: "background 0.8s ease" }}
          >
            CB
          </div>
          <p className="text-xl font-semibold tracking-tight text-white">
            Signing in{dots}
          </p>
          <p className="text-sm text-white/50">Taking you to your dashboard</p>
        </div>
      </AnimatedBubbleParticles>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInWithPasswordAction, initialState)
  const oidcEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === "azure-oidc"

  return (
    <>
      <SigningInOverlay visible={pending} />

      <main className="min-h-screen bg-background flex">
        {/* Left panel */}
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

        {/* Right panel — form */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use the account created for you by a CourseBridge super admin.
              </p>
            </div>

            {oidcEnabled && (
              <form action={startAzureOidcSignInAction} className="space-y-4">
                <Button className="w-full h-10 gap-2" type="submit">
                  <KeyRound className="size-4" />
                  Sign in with Microsoft
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Authenticate with your Microsoft account to continue.
                </p>
              </form>
            )}

            {!oidcEnabled && (
            <>
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
                Sign in
              </Button>
            </form>

            {state.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5">
                <p className="text-sm text-destructive leading-tight">{state.error}</p>
              </div>
            ) : null}
            </>
            )}

            <div className="rounded-lg border border-dashed border-border px-4 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Need access? Ask a super admin to create your account and assign your role.
              </p>
            </div>

            {!oidcEnabled && process.env.NODE_ENV === "development" && (
              <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-foreground">Dev quick login</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Password: <code className="font-mono">CourseBridgeDev123!</code>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEV_ACCOUNTS.map((acc) => (
                    <form action={signInAsDevEmail} key={acc.email}>
                      <input name="email" type="hidden" value={acc.email} />
                      <Button className="w-full h-auto py-1.5 flex flex-col gap-0" size="sm" type="submit" variant="outline">
                        <span className="text-[11px] font-medium">{acc.label}</span>
                        <span className="text-[9px] text-muted-foreground font-normal">{acc.hint}</span>
                      </Button>
                    </form>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
