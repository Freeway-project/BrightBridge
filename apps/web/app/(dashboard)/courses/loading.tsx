import { LottieLoader } from "@/components/ui/lottie-loader"
"use client"

import { motion } from "framer-motion"
export default function CourseWorkspaceLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center gap-8"
      >
        <div className="relative flex items-center justify-center">
          {/* Outer rotating dashed ring */}
          <motion.div
            className="absolute size-28 rounded-full border-t-2 border-r-2 border-dashed border-primary/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          {/* Inner rotating solid ring */}
          <motion.div
            className="absolute size-20 rounded-full border-l-2 border-b-2 border-teal-500/70"
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          {/* Center glowing orb */}
          <motion.div
            className="absolute size-12 rounded-full bg-primary/20 blur-xl"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Center spinner */}
          <LottieLoader className="relative z-10 size-8 text-primary " />
        </div>
        
        <div className="space-y-3 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-black tracking-tight text-foreground"
          >
            Loading Workspace
          </motion.h2>
          <motion.div className="flex gap-1.5 justify-center">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="size-1.5 rounded-full bg-primary"
                animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity, 
                  delay: i * 0.15,
                  ease: "easeInOut" 
                }}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
