import type { ReactNode } from "react"
import { Bell, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  backHref?: string
}

export function Topbar({ title, subtitle, actions, backHref }: TopbarProps) {
  return (
    <header className="flex h-12 items-center gap-4 border-b border-sidebar-border bg-card px-6">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {backHref && (
          <Button variant="ghost" size="icon" asChild className="-ml-2 h-8 w-8">
            <Link href={backHref}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
            {subtitle && (
              <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
      </div>
    </header>
  )
}
