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
    <Card className={cn("shadow-sm border-border/60 overflow-hidden", className)}>
      <CardHeader className="pb-1 pt-4 px-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          {Icon && (
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
              <Icon className="size-4 text-primary" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {icon === "alert-triangle" && Number(value) > 0 && (
            <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning">
              ISSUES
            </span>
          )}
          {icon === "check-square" && Number(value) > 0 && (
            <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
              DONE
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
