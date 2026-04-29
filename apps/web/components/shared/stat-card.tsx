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
    <Card className={cn("", className)}>
      <CardHeader className="pb-1 pt-4 px-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          {Icon && <Icon className="size-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}
