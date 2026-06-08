"use client"

import { ReactNode, useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"

export function ScrollCollapsibleHeader({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const container = document.getElementById("ta-dashboard-scroll")
    if (!container) return

    const handleScroll = () => {
      const currentScrollY = container.scrollTop
      
      if (currentScrollY > 120 && currentScrollY > lastScrollY.current) {
        setIsCollapsed(true)
      } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY <= 20) {
        setIsCollapsed(false)
      }
      
      lastScrollY.current = currentScrollY
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.div
      initial={false}
      animate={{ 
        height: isCollapsed ? 0 : "auto", 
        opacity: isCollapsed ? 0 : 1,
        scale: isCollapsed ? 0.95 : 1,
        marginBottom: isCollapsed ? 0 : 32
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  )
}
