"use client"

import { AlertTriangle, BookOpen, CheckSquare, Clock, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"

export type StatCardIcon = "book-open" | "clock" | "check-square" | "alert-triangle"

interface StatCardProps {
  label: string
  value: number | string
  icon?: StatCardIcon
  className?: string
  index?: number
  accent?: string
  sub?: string
}

const ICONS: Record<StatCardIcon, LucideIcon> = {
  "book-open": BookOpen,
  "clock": Clock,
  "check-square": CheckSquare,
  "alert-triangle": AlertTriangle,
}

const ACCENT_DEFAULTS: Record<StatCardIcon, string> = {
  "book-open":      "#3b82f6",
  "check-square":   "#10b981",
  "alert-triangle": "#ef4444",
  "clock":          "#8b5cf6",
}

export function StatCard({ label, value, icon, className, index = 0, accent, sub }: StatCardProps) {
  const Icon = icon ? ICONS[icon] : null
  const accentColor = accent ?? (icon ? ACCENT_DEFAULTS[icon] : "#6366f1")
  const [displayValue, setDisplayValue] = useState<number | string>(typeof value === "number" ? 0 : value)

  useEffect(() => {
    if (typeof value === "number") {
      const duration = 900
      const endValue = value
      const startTime = performance.now()

      const animate = (currentTime: number) => {
        const progress = Math.min((currentTime - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayValue(Math.round(eased * endValue))
        if (progress < 1) requestAnimationFrame(animate)
      }

      requestAnimationFrame(animate)
    } else {
      setDisplayValue(value)
    }
  }, [value])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.23, 1, 0.32, 1] }}
      className="group"
    >
      <Card className={cn(
        "relative overflow-hidden border-border/60 bg-card/50 transition-all duration-300 backdrop-blur-sm shadow-sm",
        "hover:border-primary/30 hover:shadow-md hover:-translate-y-1",
        className
      )}>
        {/* Colored top accent bar */}
        <div
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-lg transition-opacity group-hover:opacity-100 opacity-70"
          style={{ backgroundColor: accentColor }}
        />
        <div
          className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top left, ${accentColor}10 0%, transparent 60%)` }}
        />

        <CardHeader className="pb-1 pt-5 px-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
              {label}
            </p>
            {Icon && (
              <div
                className="rounded-full p-1.5 transition-all"
                style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
              >
                <Icon className="size-3.5" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p
            className="text-4xl font-black tracking-tight tabular-nums transition-all group-hover:scale-105 origin-left"
            style={{ color: accentColor }}
          >
            {displayValue}
          </p>
          {sub && (
            <p className="mt-1 text-[10px] text-muted-foreground/50 font-medium">{sub}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
