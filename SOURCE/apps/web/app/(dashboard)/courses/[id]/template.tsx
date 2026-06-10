"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"

/**
 * Next.js 13+ Template file.
 * Unlike layout.tsx, a template remounts its children on navigation,
 * which allows us to trigger Framer Motion animations when moving
 * between form steps inside the course workspace.
 */
export default function CourseWorkspaceTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        opacity: { duration: 0.2 } 
      }}
      className="flex flex-col flex-1 h-full w-full"
    >
      {children}
    </motion.div>
  )
}
