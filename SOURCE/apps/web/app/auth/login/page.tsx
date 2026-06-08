"use client"

import { useRef, useState, useEffect } from "react"
import { startAzureOidcSignInAction } from "./actions"
import { Button } from "@/components/ui/button"
import { AnimatedBubbleParticles } from "@/components/ui/animated-bubble-particles"
import { FileCheck, GitMerge, KeyRound, Users } from "lucide-react"

const BUBBLE_COLORS = [
  "#818cf8",
  "#ec4899",
  "#34d399",
  "#f59e0b",
  "#38bdf8",
  "#a78bfa",
  "#fb7185",
]

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

function SigningInOverlay({ visible }: { visible: boolean }) {
  const [colorIndex, setColorIndex] = useState(0)
  const [dots, setDots] = useState(".")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dotsRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!visible) return
    timerRef.current = setInterval(() => {
      setColorIndex((i) => (i + 1) % BUBBLE_COLORS.length)
    }, 800)
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

export default function LoginPage() {
  const [pending, setPending] = useState(false)

  return (
    <>
      <SigningInOverlay visible={pending} />

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
                Use your Microsoft account to continue.
              </p>
            </div>

            <form action={startAzureOidcSignInAction} onSubmit={() => setPending(true)} className="space-y-4">
              <Button className="w-full h-10 gap-2" type="submit" disabled={pending}>
                <KeyRound className="size-4" />
                Sign in with Microsoft
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Staff and instructors sign in via Microsoft Entra. Need access? Ask a super admin.
              </p>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
