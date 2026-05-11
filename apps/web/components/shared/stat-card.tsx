import { AlertTriangle, BookOpen, CheckSquare, Clock, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type StatCardIcon = "book-open" | "clock" | "check-square" | "alert-triangle"

interface StatCardProps {
  label: string
  value: number | string
  icon?: StatCardIcon
  className?: string
}

const ICONS: Record<StatCardIcon, LucideIcon> = {
  "book-open": BookOpen,
  "clock": Clock,
  "check-square": CheckSquare,
  "alert-triangle": AlertTriangle,
}

export function StatCard({ label, value, icon, className }: StatCardProps) {
  const Icon = icon ? ICONS[icon] : null

  return (
    <Card className={cn("bg-card shadow-lg border-[1.5px] border-primary-depth overflow-hidden", className)}>
      <CardHeader className="pb-1 pt-4 px-4">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
          {Icon && (
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Icon className="size-5 text-primary" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-black tracking-tight text-foreground">{value}</p>
          {icon === "alert-triangle" && Number(value) > 0 && (
            <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-extrabold text-warning-foreground shadow-sm uppercase">
              Fixes
            </span>
          )}
          {icon === "check-square" && Number(value) > 0 && (
            <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-extrabold text-success-foreground shadow-sm uppercase">
              Done
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
