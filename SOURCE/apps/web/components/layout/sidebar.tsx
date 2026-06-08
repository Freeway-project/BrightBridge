"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Role } from "@coursebridge/workflow"
import { NAV_ITEMS } from "@/lib/constants/nav"
import { signOut } from "@/app/dashboard/actions"
import { DisplaySettings } from "./display-settings"
import { UpdateStatusTab } from "./update-status-tab"
import { useMemeModal } from "@/components/providers/meme-provider"
import { OCLoadingLogo } from "@/components/shared/oc-loading-logo"
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
      <div className="flex min-w-0 flex-1 items-center gap-1 px-1">
        <OCLoadingLogo className="size-10 shrink-0" />
        {!collapsed && (
          <span className="text-xs font-semibold tracking-normal text-foreground truncate">
            CourseBridge
          </span>
        )}
      </div>
      <SidebarTrigger className="hidden shrink-0 md:flex text-slate-400 hover:text-slate-200 transition-colors" />
    </div>
  )
}

const CREATIVE_MESSAGES = [
  "Hey click!",
  "Why so serious?",
  "Time to dance! 💃",
  "Laugh time! 🎉",
  "Click me! 🚀",
  "Smile break 😊",
  "Fun incoming! ✨",
  "Brighten up! 🌟",
  "Quote time! ✨",
  "Stay grounded! 🌿",
  "Click for joy! 🎪",
  "Break time! 🎭",
]

export function AppSidebar({ role, userName, initialVersion }: AppSidebarProps) {
  const pathname = usePathname()
  const items = NAV_ITEMS[role]
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const { openMemeModal } = useMemeModal()
  const isTaOrStaff = role === "standard_user"
  const randomMessage = CREATIVE_MESSAGES[Math.floor(Math.random() * CREATIVE_MESSAGES.length)]

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
                      <item.icon className={cn("size-4 shrink-0 transition-transform", active && "scale-110", item.href === "/notifications" && !active && "text-yellow-400", item.href === "/notifications" && active && "text-yellow-300")} />
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

        {isTaOrStaff && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <button
                onClick={openMemeModal}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[10px]",
                  "text-white shadow-lg hover:shadow-2xl transition-all duration-300",
                  "hover:scale-105 hover:brightness-110",
                  "relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-shimmer",
                  collapsed && "justify-center"
                )}
                style={{
                  background: "linear-gradient(90deg, #ec4899 0%, #a855f7 50%, #ec4899 100%)",
                  backgroundSize: "200% 200%",
                  animation: "gradient-shift 3s ease-in-out infinite",
                  boxShadow: "0 0 30px rgba(236, 72, 153, 0.7), 0 0 60px rgba(168, 85, 247, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.15)"
                }}
                title="Get a refreshing quote!"
              >
                <Sparkles className="size-4 shrink-0" style={{
                  animation: "dance 0.6s ease-in-out infinite"
                }} />
                {!collapsed && <span style={{
                  animation: "bounce 0.8s ease-in-out infinite"
                }}>
                  {randomMessage}
                </span>}
              </button>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
