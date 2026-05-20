"use client";

import React, { useEffect } from "react";
import { motion } from "motion/react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Sparkles } from "lucide-react";
import { playUpgradeConfetti } from "@/components/shared/upgrade-confetti";

interface DeploymentNotificationProps {
  onRefresh: () => void;
  onDismiss: () => void;
}

const UPDATE_SUMMARY = [
  "Any unsaved form work is still in your browser — finish it before refreshing.",
  "All your in-progress reviews, drafts, and uploads are safe until you reload.",
  "Refresh whenever you're at a good stopping point to pick up the latest changes.",
];

export function DeploymentNotification({ onRefresh, onDismiss }: DeploymentNotificationProps) {
  useEffect(() => {
    playUpgradeConfetti({ durationMs: 10000, intensity: "high" });
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-start justify-center overflow-hidden">
      {/* Background Dimmer + Blur Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: -150, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -150, scale: 0.95 }}
        transition={{ 
          type: "spring", 
          damping: 20, 
          stiffness: 100,
          duration: 0.6 
        }}
        className="pointer-events-auto relative mt-8 w-[95%] max-w-2xl overflow-hidden rounded-3xl border border-cyan-300/25 bg-slate-950/85 p-1 shadow-[0_25px_80px_-30px_rgba(34,211,238,0.55)] backdrop-blur-xl"
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-cyan-500/20 via-blue-400/20 to-emerald-400/20 blur-xl opacity-60" />
        
        <div className="relative z-10 overflow-hidden rounded-[calc(1.5rem-1px)] bg-slate-950/95">
          <div className="absolute inset-0 opacity-30">
            <BackgroundBeams />
          </div>
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-300/10 via-transparent to-transparent" />

          <div className="relative flex flex-col items-center justify-between gap-8 px-8 py-10 sm:flex-row sm:text-left">
            <div className="relative z-20 flex max-w-[470px] flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-300/25">
                  <Sparkles className="size-4 animate-pulse" />
                </div>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  Fresh Deployment
                </span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Harsh just shipped something new
              </h2>
              <p className="max-w-[420px] text-sm leading-relaxed text-slate-300">
                A fresh build just landed. Kindly have patience — finish what you&apos;re working on, then reload to pick up the latest changes. Your work is safe until you do.
              </p>
              <details className="mt-1 max-w-[430px] rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-slate-300">
                <summary className="cursor-pointer font-medium text-cyan-200">Before you refresh</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                  {UPDATE_SUMMARY.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            </div>

            <div className="relative z-20 flex w-full max-w-[220px] flex-col gap-3">
              <Button
                onClick={onRefresh}
                className="group relative h-12 w-full overflow-hidden bg-cyan-300 px-6 font-bold text-slate-950 transition-all hover:bg-cyan-200 active:scale-[0.98]"
              >
                <div className="absolute inset-0 flex translate-y-[100%] items-center justify-center bg-cyan-200 transition-transform group-hover:translate-y-0">
                  <RefreshCw className="mr-2 size-4 animate-spin-slow" />
                  Reload Now
                </div>
                <div className="flex items-center justify-center transition-transform group-hover:translate-y-[-100%]">
                  <RefreshCw className="mr-2 size-4" />
                  Update Now
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={onDismiss}
                className="h-10 border-white/20 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Keep Working
              </Button>
            </div>
          </div>

          {/* Bottom progress-like glow bar */}
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-70"
          />
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 z-30 flex size-8 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </motion.div>

      {/* Extreme top glow light */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 0.4, height: 200 }}
        exit={{ opacity: 0, height: 0 }}
        className="absolute inset-x-0 top-0 bg-gradient-to-b from-cyan-300/25 to-transparent blur-3xl"
      />
    </div>
  );
}

export function MinimizedUpdatePill({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.05 }}
      className="fixed bottom-6 right-6 z-[90] pointer-events-auto"
    >
      <button
        onClick={onClick}
        className="group relative flex items-center gap-3 overflow-hidden rounded-full border border-cyan-500/30 bg-slate-950 px-4 py-2.5 shadow-lg shadow-cyan-500/10 backdrop-blur-md transition-all hover:border-cyan-400 hover:shadow-cyan-500/20"
      >
        {/* Pulsing indicator */}
        <div className="relative flex size-2 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400 opacity-75"></div>
          <div className="relative size-2 rounded-full bg-cyan-500"></div>
        </div>
        
        <span className="text-xs font-semibold text-slate-200">Update Available</span>
        
        <div className="flex size-5 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-colors group-hover:bg-cyan-500 group-hover:text-slate-950">
          <RefreshCw className="size-3 transition-transform group-hover:rotate-180 duration-500" />
        </div>

        {/* Inner subtle beam effect */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
      </button>
    </motion.div>
  );
}
