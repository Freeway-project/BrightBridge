"use client"

import type { ReactNode } from "react"
import { ChevronLeft, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { NotificationBell } from "./notification-bell"
import { StatusBadge } from "@/components/courses/status-badge"
import type { CourseStatus } from "@coursebridge/workflow"
import { useMemeModal } from "@/components/providers/meme-provider"

import type { Role } from "@coursebridge/workflow"

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  backHref?: string
  courseStatus?: CourseStatus
  role?: Role
}

export function Topbar({ title, subtitle, actions, backHref, courseStatus, role }: TopbarProps) {
  const { openMemeModal } = useMemeModal()
  const isTaOrStaff = role === "standard_user"

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b border-sidebar-border bg-background/50 backdrop-blur-xl px-4">
      <SidebarTrigger className="-ml-1 shrink-0 md:hidden" />
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

      <div className="flex items-center gap-3">
        {courseStatus && (
          <StatusBadge status={courseStatus} className="text-[10px]" />
        )}
        {actions}
        {isTaOrStaff && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refreshing quote"
            onClick={openMemeModal}
            title="Need a reset? Get a refreshing quote!"
          >
            <Smile className="size-4" />
          </Button>
        )}
        <NotificationBell />
      </div>
    </header>
  )
}
