"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { getSystemMigrationStatus, SYSTEM_MIGRATION_CONFIG } from "@/lib/system-migration"
import { AlertTriangle, ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TextFlippingBoard } from "@/components/ui/text-flipping-board"

const MIGRATION_STEPS = [
  {
    eyebrow: "Step 1 of 5",
    message: "Progress does not always begin with comfort.\nSometimes it begins with change.",
    variant: "board",
  },
  {
    eyebrow: "Step 2 of 5",
    message: "This migration is our step toward a better, cleaner, and more dependable experience.",
    variant: "typewriter",
  },
  {
    eyebrow: "Step 3 of 5",
    message: "The platform may change, but the people, purpose, and support remain the same.",
    variant: "reveal",
  },
  {
    eyebrow: "Step 4 of 5",
    message: "If the message is not always perfect, the intention is still clear: to help, not to hurt.",
    variant: "smooth",
  },
  {
    eyebrow: "Step 5 of 5",
    message: "Together, we are building something better.",
    variant: "board",
  },
] as const

function TypewriterText({ text }: { text: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-white/[0.02] border border-white/[0.05] p-8 text-center md:min-h-[380px] relative overflow-hidden shadow-inner">
      <motion.p className="max-w-3xl text-balance text-4xl font-semibold leading-tight text-white md:text-6xl relative z-10">
        {text.split("").map((char, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.05, delay: index * 0.04 }}
          >
            {char}
          </motion.span>
        ))}
      </motion.p>
    </div>
  )
}

function RevealText({ text }: { text: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-white/[0.02] border border-white/[0.05] p-8 text-center md:min-h-[380px] relative overflow-hidden shadow-inner">
      <motion.p className="max-w-3xl text-balance text-4xl font-semibold leading-tight text-white md:text-6xl relative z-10">
        {text.split(" ").map((word, index) => (
          <motion.span
            key={index}
            className="inline-block mr-[0.25em]"
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: index * 0.2, ease: "easeOut" }}
          >
            {word}
          </motion.span>
        ))}
      </motion.p>
    </div>
  )
}

export function SystemMigrationBanner() {
  const pathname = usePathname()
  const [status, setStatus] = useState(getSystemMigrationStatus())
  const [showModal, setShowModal] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const hostname = window.location.hostname
    setStatus(getSystemMigrationStatus(hostname))
    const interval = setInterval(() => {
      setStatus(getSystemMigrationStatus(hostname))
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Auto-open modal for ANNOUNCED; ACTIVE modal is always visible (no auto-open needed)
  useEffect(() => {
    if (status !== "ANNOUNCED") return
    const timer = window.setTimeout(() => {
      setStepIndex(0)
      setShowModal(true)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!showModal) return
    const timer = window.setTimeout(
      () => setStepIndex((current) => (current + 1) % MIGRATION_STEPS.length),
      6000,
    )
    return () => window.clearTimeout(timer)
  }, [showModal, stepIndex])

  if (status === "NORMAL" || pathname === "/maintenance") return null

  // ── ACTIVE: blocking fullscreen takeover ──────────────────────────────────
  if (status === "ACTIVE") {
    return (
      <motion.div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-neutral-950 px-6 text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/4 top-1/4 size-[50vw] rounded-full bg-red-500/10 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 size-[40vw] rounded-full bg-violet-500/10 blur-[100px]" />
        </div>

        <motion.div
          className="relative flex w-full max-w-lg flex-col items-center gap-8 text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        >
          <div className="flex size-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
            <AlertTriangle className="size-8 text-red-400" />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
              Migration Complete
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-tight md:text-5xl">
              This domain has moved.
            </h1>
            <p className="text-base leading-relaxed text-white/60">
              {SYSTEM_MIGRATION_CONFIG.REASON}
            </p>
          </div>

          <div className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-mono text-sm text-white/70">
            {SYSTEM_MIGRATION_CONFIG.NEW_DOMAIN_URL}
          </div>

          <Button
            size="lg"
            className="w-full bg-white text-neutral-950 hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
            asChild
          >
            <a href={SYSTEM_MIGRATION_CONFIG.NEW_DOMAIN_URL}>
              Go to New Domain
              <ArrowRight className="ml-2 size-4" />
            </a>
          </Button>
        </motion.div>
      </motion.div>
    )
  }

  // ── ANNOUNCED: top banner + optional info modal ───────────────────────────
  const currentStep = MIGRATION_STEPS[stepIndex]
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === MIGRATION_STEPS.length - 1

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed left-0 right-0 top-0 z-[100] p-2"
        >
          <div className="relative flex flex-col items-center justify-between gap-4 overflow-hidden rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-200 shadow-lg backdrop-blur-md md:flex-row">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-current to-transparent opacity-20" />
            <div className="relative z-10 flex w-full min-w-0 items-center gap-3">
              <div className="rounded-full bg-amber-500/20 p-2">
                <Sparkles className="size-5 animate-pulse text-amber-400" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold">Upcoming System Migration</p>
                <p className="text-xs opacity-90">
                  Scheduled for {SYSTEM_MIGRATION_CONFIG.MIGRATION_START_DATE.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="relative z-10 flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-current/30 bg-white/10 hover:bg-white/20"
                onClick={() => { setStepIndex(0); setShowModal(true) }}
              >
                What&apos;s changing
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-1/4 top-1/4 size-[40vw] animate-pulse rounded-full bg-amber-500/10 blur-[100px]" style={{ animationDuration: "4s" }} />
              <div className="absolute bottom-1/4 right-1/4 size-[50vw] animate-pulse rounded-full bg-violet-500/10 blur-[120px]" style={{ animationDuration: "6s", animationDelay: "1s" }} />
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute size-1 rounded-full bg-white/60 shadow-[0_0_12px_rgba(255,255,255,1)]"
                  style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], y: [0, -30] }}
                  transition={{ duration: 3 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 5 }}
                />
              ))}
            </div>

            <motion.div
              className="relative w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/40 text-white shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute right-3 top-3 z-20 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close migration message"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-6 p-4 md:p-8">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">{currentStep.eyebrow}</p>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${currentStep.variant}-${stepIndex}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                    >
                      {currentStep.variant === "board" ? (
                        <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3 shadow-inner md:p-5">
                          <TextFlippingBoard
                            text={currentStep.message}
                            rowCount={7}
                            columnCount={30}
                            className="max-w-none !bg-transparent shadow-none"
                            duration={stepIndex === 0 ? 2.0 : 1.5}
                          />
                        </div>
                      ) : currentStep.variant === "typewriter" ? (
                        <TypewriterText text={currentStep.message} />
                      ) : currentStep.variant === "reveal" ? (
                        <RevealText text={currentStep.message} />
                      ) : (
                        <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02] p-8 text-center shadow-inner md:min-h-[380px]">
                          <motion.p
                            className="relative z-10 max-w-3xl text-balance text-4xl font-semibold leading-tight text-white md:text-6xl"
                            initial={{ opacity: 0, filter: "blur(8px)", scale: 0.95 }}
                            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          >
                            {currentStep.message}
                          </motion.p>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-5 gap-2">
                    {MIGRATION_STEPS.map((step, index) => (
                      <button
                        key={step.eyebrow}
                        type="button"
                        onClick={() => setStepIndex(index)}
                        className={`h-1.5 rounded-full transition-colors ${index === stepIndex ? "bg-amber-300" : "bg-white/20"}`}
                        aria-label={`Show ${step.eyebrow}`}
                      />
                    ))}
                  </div>
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm"
                      disabled={isFirstStep}
                      onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-amber-300 text-neutral-950 hover:bg-amber-200 shadow-[0_0_15px_rgba(252,211,77,0.4)]"
                      onClick={() => {
                        if (isLastStep) { setShowModal(false); return }
                        setStepIndex((current) => current + 1)
                      }}
                    >
                      {isLastStep ? "Close" : "Next"}
                      {!isLastStep && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
