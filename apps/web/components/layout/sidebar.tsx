"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Role } from "@coursebridge/workflow"
import { NAV_ITEMS } from "@/lib/constants/nav"
import { signOut } from "@/app/dashboard/actions"
import { DisplaySettings } from "./display-settings"
import { UpdateStatusTab } from "./update-status-tab"
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
  initialVersion: string
}

function BrandLogo() {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  return (
    <div className="flex h-14 items-center gap-1 border-b border-sidebar-border px-3 bg-white/[0.01]">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1">
        <div className="size-7 rounded-lg bg-primary flex items-center justify-center text-[11px] font-black text-primary-foreground shrink-0 shadow-lg shadow-primary/40">
          CB
        </div>
        {!collapsed && (
          <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground truncate">
            CourseBridge
          </span>
        )}
      </div>
      <SidebarTrigger className="hidden shrink-0 md:flex text-slate-400 hover:text-slate-200 transition-colors" />
    </div>
  )
}

export function AppSidebar({ role, userName, initialVersion }: AppSidebarProps) {
  const pathname = usePathname()
  const items = NAV_ITEMS[role]
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar/50 backdrop-blur-xl">
      <SidebarHeader className="p-0">
        <BrandLogo />
      </SidebarHeader>

      <SidebarContent className="px-2 pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/")
                const btn = (
                  <SidebarMenuButton asChild isActive={active} className={cn(
                    "h-10 px-3 transition-all duration-300 rounded-xl justify-start group-data-[collapsible=icon]:justify-center",
                    active ? "bg-primary/15 text-primary ring-1 ring-primary/30 shadow-lg shadow-primary/5 font-black uppercase tracking-widest text-[10px]" : "text-muted-foreground hover:bg-white/5 hover:text-foreground font-bold text-[11px]"
                  )}>
                    <Link
                      href={item.href}
                      className={cn("flex w-full items-center gap-2", collapsed && "justify-center")}
                    >
                      <item.icon className={cn("size-4 shrink-0 transition-transform", active && "scale-110")} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                )
                return (
                  <SidebarMenuItem key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="right" className="bg-popover border-border-icy font-black uppercase tracking-widest text-[9px]">{item.label}</TooltipContent>
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

      <SidebarFooter className="p-3">
        <div className="border border-sidebar-border bg-white/[0.02] rounded-2xl p-2 space-y-2 shadow-inner backdrop-blur-md">
          {!collapsed && (
            <div className="px-2 py-1 flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Active Session</span>
              <span className="text-[10px] font-bold text-foreground/70 truncate">
                {userName}
              </span>
            </div>
          )}
          <DisplaySettings />
          {!collapsed && <UpdateStatusTab initialVersion={initialVersion} />}
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut className="size-3.5 shrink-0" />
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
