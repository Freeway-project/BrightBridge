"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, UserCheck, UserMinus, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Role } from "@coursebridge/workflow"
import { NAV_ITEMS } from "@/lib/constants/nav"
import { signOut, impersonateUserAction, getImpersonatableUsersAction, stopImpersonatingAction } from "@/app/dashboard/actions"
import { DisplaySettings } from "./display-settings"
import { SupportMessageDialog } from "./support-message-dialog"
import Lottie from "lottie-react"
import aiAnimationBlush from "@/assets/3c6d4dc5-50cf-45ba-9775-ab665ca5923d.json"
import aiAnimationOcean from "@/assets/559b1333-2acb-45f2-91d0-f47e905945dd.json"
import aiAnimationMono from "@/assets/7151ad77-5cd9-4b4a-a8d9-eb7ae1f355f8.json"
import aiAnimationAurora from "@/assets/9612aa98-116d-11ee-b4c5-2f9cdafc1909.json"
import { OCLoadingLogo } from "@/components/shared/oc-loading-logo"
import { useTweaks, type ThemeId } from "@/components/shared/tweak-provider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const THEME_LOTTIE: Record<ThemeId, unknown> = {
  blush: aiAnimationBlush,
  ocean: aiAnimationOcean,
  // The original sunset asset references external /i/image_*.webp files that
  // are not shipped with the app, which causes repeated 404s in the sidebar.
  sunset: aiAnimationAurora,
  monochrome: aiAnimationMono,
  aurora: aiAnimationAurora,
}
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
  isImpersonating?: boolean
  impersonatorRole?: Role
  impersonatorName?: string
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

export function AppSidebar({
  role,
  userName,
  initialVersion,
  isImpersonating = false,
  impersonatorRole,
  impersonatorName,
}: AppSidebarProps) {
  const pathname = usePathname()
  const items = NAV_ITEMS[role]
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const canPokeSupport = role === "standard_user" || role === "admin_full"
  const { settings } = useTweaks()
  const themeAnimation = THEME_LOTTIE[settings.theme] ?? aiAnimationOcean

  const [impersonateOpen, setImpersonateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<{ id: string; email: string; fullName: string | null; role: Role }[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    if (!impersonateOpen) return

    let active = true
    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        const data = await getImpersonatableUsersAction(searchQuery)
        if (active) {
          setUsers(data)
        }
      } catch (err) {
        console.error("Failed to load users for impersonation:", err)
      } finally {
        if (active) {
          setLoadingUsers(false)
        }
      }
    }

    const timer = setTimeout(fetchUsers, 200)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [searchQuery, impersonateOpen])

  const handleImpersonate = async (userId: string) => {
    try {
      await impersonateUserAction(userId)
      setImpersonateOpen(false)
    } catch (err) {
      console.error("Impersonation failed:", err)
    }
  }

  const canImpersonate = role === "admin_full" || impersonatorRole === "admin_full"

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

        {!collapsed && (role === "admin_full" || role === "standard_user") && (
          <div className="mt-auto mb-4 px-4 flex justify-center">
            <Lottie key={settings.theme} animationData={themeAnimation} loop={true} className="w-full max-w-[120px]" />
          </div>
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
          {canImpersonate && (
            <Dialog open={impersonateOpen} onOpenChange={setImpersonateOpen}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <button className="flex w-full items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-foreground transition-all">
                        <UserCheck className="size-4 shrink-0" />
                      </button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover border-border-icy font-black uppercase tracking-widest text-[9px]">
                    Impersonate User
                  </TooltipContent>
                </Tooltip>
              ) : (
                <DialogTrigger asChild>
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:bg-white/5 hover:text-foreground transition-all">
                    <UserCheck className="size-3.5 shrink-0" />
                    <span>Impersonate User</span>
                  </button>
                </DialogTrigger>
              )}
              <DialogContent className="sm:max-w-[425px] bg-slate-900 border border-slate-800 text-slate-100">
                <DialogHeader>
                  <DialogTitle className="text-sm font-semibold">Impersonate User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <Input
                      placeholder="Search by name, email, or role..."
                      className="pl-8 text-xs bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500 focus-visible:ring-primary"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[250px] overflow-y-auto space-y-1 pr-1">
                    {loadingUsers ? (
                      <p className="text-xs text-slate-400 text-center py-4">Loading users...</p>
                    ) : users.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No users found</p>
                    ) : (
                      users.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => handleImpersonate(u.id)}
                          className="w-full flex items-center justify-between text-left rounded-lg p-2 text-xs hover:bg-white/5 transition-colors border border-transparent hover:border-slate-800"
                        >
                          <div>
                            <p className="font-semibold text-slate-200">{u.fullName ?? "No name"}</p>
                            <p className="text-[10px] text-slate-400">{u.email}</p>
                          </div>
                          <span className="text-[9px] uppercase tracking-wider font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            {u.role}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {isImpersonating && (
            <form action={stopImpersonatingAction}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center rounded-xl p-2 text-destructive hover:bg-destructive/10 transition-all animate-pulse"
                    >
                      <UserMinus className="size-4 shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover border-border-icy font-black uppercase tracking-widest text-[9px] text-destructive">
                    Stop Impersonating
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 transition-all animate-pulse"
                >
                  <UserMinus className="size-3.5 shrink-0" />
                  <span>Stop Impersonating</span>
                </button>
              )}
            </form>
          )}

          {canPokeSupport && <SupportMessageDialog collapsed={collapsed} />}
          <DisplaySettings />
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
