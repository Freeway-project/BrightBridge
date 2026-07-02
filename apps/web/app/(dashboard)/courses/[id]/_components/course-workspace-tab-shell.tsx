"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { Layout, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { CourseChatPanel } from "@/app/(dashboard)/instructor/courses/[id]/_components/course-chat-panel"
import type { CourseComment } from "@/lib/services/comments"
import type { Role } from "@coursebridge/workflow"

const CAN_MARK_ANSWERED: readonly string[] = ["admin_full", "super_admin", "standard_user"]

type TabId = "workspace" | "chat"

export function CourseWorkspaceTabShell({
  courseId,
  currentUserId,
  role,
  sharedComments,
  children,
}: {
  courseId: string
  currentUserId: string
  role: Role
  sharedComments: CourseComment[]
  children: ReactNode
}) {
  const [tab, setTab] = useState<TabId>("workspace")

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: "workspace", label: "Workspace", icon: <Layout className="size-3.5" aria-hidden /> },
    { id: "chat",      label: "Chat",      icon: <MessageSquare className="size-3.5" aria-hidden /> },
  ]

  return (
    <TweakableContent className="relative flex flex-1 flex-col overflow-hidden bg-card/[0.01]">
      {/* Decorative blobs (preserved from original layout) */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] left-[5%] w-[40%] h-[50%] rounded-full bg-primary/[0.03] dark:bg-primary/[0.015] blur-[120px] animate-pulse" style={{ animationDuration: "12s" }} />
        <div className="absolute top-[30%] -right-[5%] w-[45%] h-[55%] rounded-full bg-secondary/[0.05] dark:bg-secondary/[0.025] blur-[150px] animate-pulse" style={{ animationDuration: "18s" }} />
        <div className="absolute -bottom-[15%] left-[20%] w-[35%] h-[45%] rounded-full bg-primary/[0.02] dark:bg-primary/[0.01] blur-[130px] animate-pulse" style={{ animationDuration: "15s" }} />
      </div>

      {/* Tab strip */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-muted/20 px-4" style={{ position: "relative", zIndex: 1 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Workspace tab — the existing scrolling sections */}
      {tab === "workspace" && (
        <div className="min-h-0 flex-1 overflow-hidden">
          {children}
        </div>
      )}

      {/* Chat tab — shared group chat between TA, admin, and instructor */}
      {tab === "chat" && (
        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <CourseChatPanel
            courseId={courseId}
            comments={sharedComments}
            currentUserId={currentUserId}
            canPost
            canMarkAnswered={CAN_MARK_ANSWERED.includes(role)}
          />
        </div>
      )}
    </TweakableContent>
  )
}
