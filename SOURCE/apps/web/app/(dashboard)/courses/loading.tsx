"use client"
import { LottieLoader } from "@/components/ui/lottie-loader"

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
        <div className="relative flex items-center justify-center w-[60vw] max-w-[500px] aspect-square">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="w-full h-full drop-shadow-2xl"
          >
            <LottieLoader className="w-full h-full text-primary" />
          </motion.div>
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
