"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import type { Role } from "@coursebridge/workflow"
import { NAV_ITEMS } from "@/lib/constants/nav"
import { signOut } from "@/app/dashboard/actions"
import { DisplaySettings } from "./display-settings"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AppSidebarProps {
  role: Role
  userName: string
}

function BrandLogo() {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  return (
    <div className="flex h-12 items-center gap-1 border-b border-sidebar-border px-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
        <div className="size-6 rounded bg-sidebar-primary flex items-center justify-center text-[10px] font-bold text-sidebar-primary-foreground shrink-0">
          CB
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-foreground truncate">
            CourseBridge
          </span>
        )}
      </div>
      <SidebarTrigger className="hidden shrink-0 md:flex" />
    </div>
  )
}

export function AppSidebar({ role, userName }: AppSidebarProps) {
  const pathname = usePathname()
  const items = NAV_ITEMS[role]
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-0">
        <BrandLogo />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/")
                const btn = (
                  <SidebarMenuButton asChild isActive={active}>
                    <Link href={item.href}>
                      <item.icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                )
                return (
                  <SidebarMenuItem key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      btn
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="border-t border-sidebar-border px-1 py-2 space-y-1">
          {!collapsed && (
            <p className="px-2 text-[11px] text-sidebar-foreground/50 truncate mb-1">
              {userName}
            </p>
          )}
          <DisplaySettings />
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="size-4 shrink-0" />
              {!collapsed && <span>Sign out</span>}
            </button>
          </form>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

// Keep old export name working for any direct imports
export { AppSidebar as Sidebar }
