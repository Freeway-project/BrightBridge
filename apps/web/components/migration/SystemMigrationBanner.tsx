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

  useEffect(() => {
    if (status === "NORMAL") return

    const timer = window.setTimeout(() => {
      setStepIndex(0)
      setShowModal(true)
    }, 900)

    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!showModal) return

    const tick = () => {
      setStepIndex((current) => (current + 1) % MIGRATION_STEPS.length)
    }

    const currentHoldTime = stepIndex === 0 ? 18000 : 12000
    const timer = window.setTimeout(tick, currentHoldTime)

    return () => window.clearTimeout(timer)
  }, [showModal, stepIndex])

  if (status === "NORMAL" || pathname === "/maintenance") return null

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
          className="fixed top-0 left-0 right-0 z-[100] p-2"
        >
          <div
            className={`
              relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-md px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4
              ${status === "ACTIVE" 
                ? "bg-red-500/10 border-red-500/50 text-red-200" 
                : "bg-amber-500/10 border-amber-500/50 text-amber-200"}
            `}
          >
            <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-current to-transparent animate-pulse" />

            <div className="flex items-center gap-3 relative z-10 w-full min-w-0">
              <div className={`p-2 rounded-full ${status === "ACTIVE" ? "bg-red-500/20" : "bg-amber-500/20"}`}>
                {status === "ACTIVE" ? <AlertTriangle className="w-5 h-5" /> : <Sparkles className="w-5 h-5 animate-pulse text-amber-400" />}
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold text-sm">
                  {status === "ACTIVE" ? "System Migration in Progress" : "Upcoming System Migration"}
                </p>
                <p className="text-xs opacity-90">
                  New domain goes live at {SYSTEM_MIGRATION_CONFIG.MIGRATION_START_DATE.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10 shrink-0">
              <Button
                size="sm"
                variant={status === "ACTIVE" ? "secondary" : "outline"}
                className="h-8 border-current/30 bg-white/10 hover:bg-white/20"
                onClick={() => {
                  setStepIndex(0)
                  setShowModal(true)
                }}
              >
                What&apos;s changing
              </Button>
              {status === "ACTIVE" ? (
                <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white h-8 shadow-[0_0_15px_rgba(220,38,38,0.4)]" asChild>
                  <a href={SYSTEM_MIGRATION_CONFIG.NEW_DOMAIN_URL}>
                    Go to New Domain <ArrowRight className="ml-2 w-3 h-3" />
                  </a>
                </Button>
              ) : (
                <p className="text-[11px] opacity-80">
                  Scheduled for {SYSTEM_MIGRATION_CONFIG.MIGRATION_START_DATE.toLocaleString()}
                </p>
              )}
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
            {/* Wholesome Tingling Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 size-[40vw] rounded-full bg-amber-500/10 blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
              <div className="absolute bottom-1/4 right-1/4 size-[50vw] rounded-full bg-violet-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '6s', animationDelay: "1s" }} />
              <div className="absolute top-1/2 left-1/2 size-[30vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[80px] animate-pulse" style={{ animationDuration: '5s', animationDelay: "2s" }} />
              
              {/* Sparkles */}
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute size-1 rounded-full bg-white/60 shadow-[0_0_12px_rgba(255,255,255,1)]"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    y: [0, -30],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 5,
                    repeat: Infinity,
                    delay: Math.random() * 5,
                  }}
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
                        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] shadow-inner p-3 md:p-5 relative overflow-hidden">
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
                        <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-white/[0.02] border border-white/[0.05] p-8 text-center md:min-h-[380px] shadow-inner relative overflow-hidden">
                          <motion.p
                            className="max-w-3xl text-balance text-4xl font-semibold leading-tight text-white md:text-6xl relative z-10"
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
                  <div className="flex items-center justify-between gap-3 relative z-10">
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
                        if (isLastStep) {
                          setShowModal(false)
                          return
                        }
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
