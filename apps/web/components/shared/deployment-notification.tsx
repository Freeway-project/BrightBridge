"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Sparkles, Rocket, ArrowRight, ChevronUp } from "lucide-react";
import { playUpgradeConfetti } from "@/components/shared/upgrade-confetti";

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
  useEffect(() => {
    playUpgradeConfetti({ durationMs: 10000, intensity: "high" });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Background Dimmer + Blur Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onDismiss}
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
        className="pointer-events-auto relative mt-8 w-[95%] max-w-2xl overflow-hidden rounded-3xl border border-primary/25 bg-card/90 p-1 shadow-[0_25px_80px_-30px_rgba(59,130,246,0.5)] backdrop-blur-xl"
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-primary/20 via-primary/20 to-primary/20 blur-xl opacity-60" />
        
        <div className="relative z-10 overflow-hidden rounded-[calc(1.5rem-1px)] bg-background/95">
          <div className="absolute inset-0 opacity-30">
            <BackgroundBeams />
          </div>
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

          <div className="relative flex flex-col items-center justify-between gap-8 px-8 py-10 sm:flex-row sm:text-left">
            <div className="relative z-20 flex max-w-[470px] flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25">
                  <Sparkles className="size-4 animate-pulse" />
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                  Platform Update
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                CourseBridge upgraded
              </h2>
              <p className="max-w-[420px] text-sm leading-relaxed text-secondary-foreground">
                New improvements are ready. Reload now to run on the latest version with safer draft handling and clearer update visibility.
              </p>
              <details className="mt-1 max-w-[430px] rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-sm text-secondary-foreground">
                <summary className="cursor-pointer font-bold text-primary">What&apos;s in this update</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-secondary-foreground">
                  {UPDATE_SUMMARY.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            </div>

            <div className="relative z-20 flex w-full max-w-[220px] flex-col gap-3">
              <Button
                onClick={onRefresh}
                className="group relative h-12 w-full overflow-hidden bg-primary px-6 font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <div className="absolute inset-0 flex translate-y-[100%] items-center justify-center bg-primary transition-transform group-hover:translate-y-0">
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
                className="h-10 border-primary/20 bg-transparent text-secondary-foreground hover:bg-primary/10 hover:text-foreground font-bold"
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
            className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-70"
          />
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 z-30 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
        >
          <X className="size-4" />
        </button>
      </motion.div>

      {/* Extreme top glow light */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 0.4, height: 200 }}
        exit={{ opacity: 0, height: 0 }}
        className="absolute inset-x-0 top-0 bg-gradient-to-b from-primary/25 to-transparent blur-3xl"
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
        className="group relative flex items-center gap-3 overflow-hidden rounded-full border border-primary/30 bg-card px-4 py-2.5 shadow-lg shadow-primary/10 backdrop-blur-md transition-all hover:border-primary/50 hover:shadow-primary/20"
      >
        {/* Pulsing indicator */}
        <div className="relative flex size-2 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/40 opacity-75"></div>
          <div className="relative size-2 rounded-full bg-primary"></div>
        </div>
        
        <span className="text-xs font-black uppercase tracking-widest text-foreground">Update Available</span>
        
        <div className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <RefreshCw className="size-3 transition-transform group-hover:rotate-180 duration-500" />
        </div>

        {/* Inner subtle beam effect */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
      </button>
    </motion.div>
  );
}
