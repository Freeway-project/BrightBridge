"use client"

import { useActionState } from "react"
import { DEV_ACCOUNTS } from "./dev-accounts"
import { signInAsDevEmail, signInWithPasswordAction, type ActionState } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, ArrowRight, FileCheck, GitMerge, KeyRound, Lock, Mail, Users } from "lucide-react"

const FEATURES = [
  {
    icon: GitMerge,
    title: "Structured migration reviews",
    desc: "Step-by-step TA checklists for every Moodle → Brightspace course.",
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
    <main className="relative min-h-screen overflow-hidden bg-[#080808] flex">
      {/* ── Ambient background orbs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
      >
        {/* Top-left violet orb */}
        <div
          className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(129,140,248,0.18) 0%, rgba(99,102,241,0.06) 55%, transparent 70%)",
            filter: "blur(2px)",
          }}
        />
        {/* Bottom-right fuchsia orb */}
        <div
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(167,139,250,0.14) 0%, rgba(139,92,246,0.05) 55%, transparent 70%)",
            filter: "blur(2px)",
          }}
        />
        {/* Center-left accent strip */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-px w-2/3 opacity-20"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(129,140,248,0.8), transparent)",
          }}
        />
      </div>

      {/* ── Left panel — brand / features ── */}
      <div className="relative z-10 hidden lg:flex w-[46%] flex-col justify-between px-14 py-12"
        style={{
          background: "linear-gradient(160deg, #080808 0%, #0d0b1a 100%)",
          borderRight: "1px solid rgba(129,140,248,0.12)",
        }}
      >
        {/* Top: Logo */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-bold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)",
              color: "#fff",
              boxShadow: "0 0 20px rgba(129,140,248,0.4)",
            }}
          >
            CB
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white/90">
            CourseBridge
          </span>
        </div>

        {/* Middle: Hero + features */}
        <div className="space-y-10">
          <div className="space-y-4">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide uppercase"
              style={{
                borderColor: "rgba(129,140,248,0.3)",
                background: "rgba(129,140,248,0.08)",
                color: "#818cf8",
              }}
            >
              Internal platform
            </div>
            <h1 className="text-[2.6rem] font-bold leading-[1.15] tracking-tight text-white">
              Course migration,{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                done right.
              </span>
            </h1>
            <p className="max-w-[340px] text-[15px] leading-relaxed text-white/50">
              Internal review workspace for moving Moodle courses into Brightspace
              with clear ownership and staged approval.
            </p>
          </div>

          <div className="space-y-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: "rgba(129,140,248,0.10)",
                    border: "1px solid rgba(129,140,248,0.2)",
                  }}
                >
                  <feature.icon className="h-4 w-4" style={{ color: "#818cf8" }} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[13.5px] font-semibold text-white/85">{feature.title}</p>
                  <p className="text-[12.5px] leading-relaxed text-white/40">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Footer */}
        <p className="text-[11px] text-white/20">
          © {new Date().getFullYear()} CourseBridge · Internal use only
        </p>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-16">
        {/* Glassmorphism card */}
        <div
          className="w-full max-w-[400px] rounded-2xl p-8 space-y-7"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 0 0 1px rgba(129,140,248,0.06), 0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Mobile logo (visible < lg) */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-bold"
              style={{
                background: "linear-gradient(135deg, #818cf8, #6366f1)",
                color: "#fff",
              }}
            >
              CB
            </div>
            <span className="text-sm font-semibold text-white/80">CourseBridge</span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-[1.6rem] font-bold tracking-tight text-white">
              Welcome back
            </h2>
            <p className="text-[13.5px] leading-relaxed text-white/45">
              Sign in with the account set up by your CourseBridge administrator.
            </p>
          </div>

          {/* Form */}
          <form action={formAction} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                className="text-[12.5px] font-medium text-white/60 uppercase tracking-wide"
                htmlFor="email"
              >
                Email address
              </label>
              <div className="relative group">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  name="email"
                  placeholder="you@institution.edu"
                  required
                  type="email"
                  autoComplete="email"
                  className="h-11 pl-10 pr-4 text-[14px] text-white/90 placeholder:text-white/20 border-white/8 focus-visible:border-[#818cf8]/60 focus-visible:ring-[#818cf8]/20 transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                className="text-[12.5px] font-medium text-white/60 uppercase tracking-wide"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative group">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  name="password"
                  required
                  type="password"
                  autoComplete="current-password"
                  className="h-11 pl-10 pr-4 text-[14px] text-white/90 placeholder:text-white/20 border-white/8 focus-visible:border-[#818cf8]/60 focus-visible:ring-[#818cf8]/20 transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                  }}
                />
              </div>
            </div>

            {/* Error */}
            {state.error ? (
              <div
                className="flex items-start gap-2.5 rounded-xl px-4 py-3"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                <p className="text-[13px] leading-snug text-red-300">{state.error}</p>
              </div>
            ) : null}

            {/* Submit */}
            <button
              type="submit"
              disabled={pending}
              className="group relative w-full h-11 overflow-hidden rounded-xl text-[14px] font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: pending
                  ? "rgba(129,140,248,0.5)"
                  : "linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #a78bfa 100%)",
                boxShadow: pending
                  ? "none"
                  : "0 0 24px rgba(129,140,248,0.35), 0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              {/* Shimmer overlay */}
              {!pending && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  }}
                />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {pending ? (
                  <>
                    <span
                      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                      aria-hidden="true"
                    />
                    Signing in…
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                    Sign in
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Access hint */}
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-[12px] leading-relaxed text-white/35">
              Need access? Ask a super admin to create your account and assign your role.
            </p>
          </div>

          {/* Dev quick-login */}
          {process.env.NODE_ENV === "development" && (
            <div
              className="rounded-xl px-4 py-4 space-y-3"
              style={{
                background: "rgba(245,158,11,0.05)",
                border: "1px dashed rgba(245,158,11,0.3)",
              }}
            >
              <div>
                <p className="text-[12px] font-semibold text-amber-400/90">Dev quick login</p>
                <p className="text-[11.5px] text-white/35 mt-0.5">
                  Password:{" "}
                  <code className="font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded">
                    CourseBridgeDev123!
                  </code>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {DEV_ACCOUNTS.map((acc) => (
                  <form action={signInAsDevEmail} key={acc.email}>
                    <input name="email" type="hidden" value={acc.email} />
                    <button
                      type="submit"
                      className="w-full rounded-lg py-2 px-2 flex flex-col items-center gap-0.5 text-center transition-all duration-150 hover:bg-white/6 active:scale-[0.97]"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <span className="text-[11.5px] font-semibold text-white/75">{acc.label}</span>
                      <span className="text-[10px] text-white/35 font-normal">{acc.hint}</span>
                    </button>
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
