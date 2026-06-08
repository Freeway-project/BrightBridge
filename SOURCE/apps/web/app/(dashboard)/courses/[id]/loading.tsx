"use client"

import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

export default function InternalWorkspaceLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[400px]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative flex items-center justify-center">
          <motion.div
            className="absolute size-12 rounded-full border-2 border-primary/20 border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <Loader2 className="size-5 text-primary/40 animate-pulse" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
          Syncing...
        </p>
      </motion.div>
    </div>
  )
}
