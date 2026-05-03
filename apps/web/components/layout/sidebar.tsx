"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "@/lib/constants/nav"
import type { Role } from "@coursebridge/workflow"
import { signOut } from "@/app/dashboard/actions"
import { LogOut } from "lucide-react"
import { DisplaySettings } from "./display-settings"

interface SidebarProps {
  role: Role
  userName: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const items = NAV_ITEMS[role]

  return (
    <aside className="flex h-screen w-[196px] flex-shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex h-12 items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="size-6 rounded bg-sidebar-primary flex items-center justify-center text-[10px] font-bold text-sidebar-primary-foreground">
          CB
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground">CourseBridge</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-1">
        <p className="px-2 text-[11px] text-sidebar-foreground/50 truncate mb-1">{userName}</p>
        <DisplaySettings />
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
