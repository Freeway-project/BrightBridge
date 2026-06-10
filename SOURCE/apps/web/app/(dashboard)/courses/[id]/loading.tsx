"use client"
import { LottieLoader } from "@/components/ui/lottie-loader"

import { motion } from "framer-motion"
export default function InternalWorkspaceLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-0 w-full h-full p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4 w-full h-full max-h-[800px] justify-center"
      >
        <div className="relative flex items-center justify-center w-full flex-1 min-h-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="w-full h-full drop-shadow-xl flex items-center justify-center"
          >
            <LottieLoader className="w-full h-full text-primary" />
          </motion.div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 shrink-0 pb-8">
          Syncing...
        </p>
      </motion.div>
    </div>
  )
}
