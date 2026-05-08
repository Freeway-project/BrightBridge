"use client";

import React from "react";
import { motion } from "motion/react";
import { LampContainer } from "@/components/ui/lamp";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Sparkles } from "lucide-react";

interface DeploymentNotificationProps {
  onRefresh: () => void;
  onDismiss: () => void;
}

const UPDATE_SUMMARY = [
  "Your draft progress is now safer while you move between pages and tabs.",
  "Display settings now apply across the main workspace while keeping the left sidebar stable.",
  "You can check version status and open update notices anytime from the sidebar tab.",
];

export function DeploymentNotification({ onRefresh, onDismiss }: DeploymentNotificationProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-hidden pointer-events-none">
      {/* Background Dimmer + Blur Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
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
        className="relative mt-8 w-[95%] max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 p-1 shadow-2xl backdrop-blur-xl pointer-events-auto"
      >
        {/* Glow effect around the border */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 blur-xl opacity-50" />
        
        <div className="relative z-10 overflow-hidden rounded-[calc(1.5rem-1px)] bg-slate-950">
          <div className="absolute inset-0 opacity-30">
            <BackgroundBeams />
          </div>

          <div className="relative flex flex-col items-center justify-between gap-6 px-8 py-10 sm:flex-row sm:text-left">
            <div className="relative z-20 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                  <Sparkles className="size-4 animate-pulse" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-500">
                  System Update
                </span>
              </div>
              
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                A new CourseBridge update is live
              </h2>
              <p className="max-w-[340px] text-sm leading-relaxed text-slate-400">
                We improved draft safety and update visibility so your workflow feels smoother. Would you like to switch now?
              </p>
              <details className="mt-1 max-w-[380px] rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                <summary className="cursor-pointer text-cyan-300">What&apos;s in this update</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                  {UPDATE_SUMMARY.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            </div>

            <div className="relative z-20 flex flex-col gap-3 sm:min-w-[180px]">
              <Button
                onClick={onRefresh}
                className="group relative h-12 w-full overflow-hidden bg-white px-6 font-bold text-slate-950 transition-all hover:bg-cyan-400 hover:text-slate-950 active:scale-95"
              >
                <div className="absolute inset-0 flex translate-y-[100%] items-center justify-center bg-cyan-400 transition-transform group-hover:translate-y-0">
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
                className="h-10 border-white/10 bg-transparent text-slate-400 hover:bg-white/5 hover:text-white"
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
            className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"
          />
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 z-30 flex size-8 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </motion.div>

      {/* Extreme top glow light */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 0.4, height: 200 }}
        exit={{ opacity: 0, height: 0 }}
        className="absolute inset-x-0 top-0 bg-gradient-to-b from-cyan-500/20 to-transparent blur-3xl"
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
