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
}

const ICONS: Record<StatCardIcon, LucideIcon> = {
  "book-open": BookOpen,
  "clock": Clock,
  "check-square": CheckSquare,
  "alert-triangle": AlertTriangle,
}

export function StatCard({ label, value, icon, className, index = 0 }: StatCardProps) {
  const Icon = icon ? ICONS[icon] : null
  const [displayValue, setDisplayValue] = useState<number | string>(typeof value === "number" ? 0 : value)

  useEffect(() => {
    if (typeof value === "number") {
      const duration = 1000
      const startValue = 0
      const endValue = value
      const startTime = performance.now()

      const animate = (currentTime: number) => {
        const elapsedTime = currentTime - startTime
        const progress = Math.min(elapsedTime / duration, 1)
        const currentCount = Math.floor(progress * (endValue - startValue) + startValue)
        
        setDisplayValue(currentCount)

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
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
        "hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-1",
        className
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        
        <CardHeader className="pb-1 pt-4 px-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 group-hover:text-primary/70 transition-colors">
              {label}
            </p>
            {Icon && (
              <div className="rounded-full bg-muted/30 p-1.5 transition-all group-hover:bg-primary/10 group-hover:text-primary">
                <Icon className="size-3.5" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-3xl font-black tracking-tight text-foreground transition-all group-hover:scale-110 origin-left">
            {displayValue}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
