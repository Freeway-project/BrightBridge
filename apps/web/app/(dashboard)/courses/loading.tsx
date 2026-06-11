"use client"
import { LottieLoader } from "@/components/ui/lottie-loader"

import { motion } from "framer-motion"
export default function CourseWorkspaceLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center bg-background/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center gap-8 w-full h-full max-h-[800px] justify-center"
      >
        <div className="relative flex items-center justify-center w-full flex-1 min-h-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="w-full h-full drop-shadow-2xl flex items-center justify-center"
          >
            <LottieLoader className="w-full h-full text-primary" />
          </motion.div>
        </div>
        
        <div className="space-y-3 text-center shrink-0 pb-8">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-black tracking-tight text-foreground"
          >
            Loading Workspace
          </motion.h2>
        </div>
      </motion.div>
    </div>
  )
}
