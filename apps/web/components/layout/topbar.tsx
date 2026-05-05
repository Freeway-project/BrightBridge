import type { ReactNode } from "react"
import { Bell, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  backHref?: string
}

export function Topbar({ title, subtitle, actions, backHref }: TopbarProps) {
  return (
    <header className="relative flex h-12 items-center gap-2 border-b border-[--border-default] bg-[--surface-0] px-4 overflow-hidden">
      {/* Gradient Overlay */}
      <div className="absolute inset-y-0 left-0 w-64 bg-gradient-to-r from-[--primary]/10 to-transparent pointer-events-none" />
      
      <SidebarTrigger className="-ml-1 shrink-0 md:hidden relative z-10" />
      <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
        {backHref && (
          <Button variant="ghost" size="icon" asChild className="-ml-2 h-8 w-8 hover:bg-[--surface-4]">
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

      <div className="flex items-center gap-2 relative z-10">
        {actions}
        <Button variant="ghost" size="icon" aria-label="Notifications" className="hover:bg-[--surface-4]">
          <Bell className="size-4" />
        </Button>
      </div>
    </header>
  )
}
