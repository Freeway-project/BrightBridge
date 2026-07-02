"use client"

import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { Layout, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { CourseChatPanel } from "@/app/(dashboard)/instructor/courses/[id]/_components/course-chat-panel"
import { useCourseCommentRealtime } from "@/lib/workspace/use-course-comment-realtime"
import { useRouter } from "next/navigation"
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
  const [newCount, setNewCount] = useState(0)
  const [bump, setBump] = useState(0)
  const prevLen = useRef(sharedComments.length)
  const router = useRouter()

  // Detect new shared comments arriving (after realtime refresh / router.refresh)
  useEffect(() => {
    const diff = sharedComments.length - prevLen.current
    if (diff > 0 && tab !== "chat") {
      setNewCount((n) => n + diff)
      setBump((b) => b + 1)
    }
    prevLen.current = sharedComments.length
  }, [sharedComments.length, tab])

  // Subscribe to realtime new-comment events and trigger a page refresh
  useCourseCommentRealtime(courseId, () => router.refresh())

  function handleChatClick() {
    setTab("chat")
    setNewCount(0)
  }

  return (
    <TweakableContent className="relative flex flex-1 flex-col overflow-hidden bg-card/[0.01]">
      {/* Decorative blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] left-[5%] w-[40%] h-[50%] rounded-full bg-primary/[0.03] dark:bg-primary/[0.015] blur-[120px] animate-pulse" style={{ animationDuration: "12s" }} />
        <div className="absolute top-[30%] -right-[5%] w-[45%] h-[55%] rounded-full bg-secondary/[0.05] dark:bg-secondary/[0.025] blur-[150px] animate-pulse" style={{ animationDuration: "18s" }} />
        <div className="absolute -bottom-[15%] left-[20%] w-[35%] h-[45%] rounded-full bg-primary/[0.02] dark:bg-primary/[0.01] blur-[130px] animate-pulse" style={{ animationDuration: "15s" }} />
      </div>

      {/* Tab strip */}
      <div className="relative z-10 flex shrink-0 items-center gap-1 border-b border-border bg-muted/20 px-4">

        {/* Workspace tab */}
        <button
          type="button"
          onClick={() => setTab("workspace")}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors",
            tab === "workspace"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          <Layout className="size-3.5" aria-hidden />
          Workspace
        </button>

        {/* Chat tab — with new-comment badge */}
        <button
          type="button"
          onClick={handleChatClick}
          className={cn(
            "relative flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors",
            tab === "chat"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          <MessageSquare className="size-3.5" aria-hidden />
          Chat
          {newCount > 0 && (
            <span
              key={bump}
              className="ml-0.5 inline-flex h-[18px] min-w-[18px] animate-in zoom-in-50 duration-200 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-md"
            >
              {newCount > 99 ? "99+" : newCount}
            </span>
          )}
          {/* Pulse ring on new comment while not on chat tab */}
          {bump > 0 && tab !== "chat" && (
            <span
              key={`ring-${bump}`}
              className="absolute right-1 top-1.5 size-2 rounded-full bg-red-500 animate-ping"
            />
          )}
        </button>

      </div>

      {/* Workspace content */}
      {tab === "workspace" && (
        <div className="min-h-0 flex-1 overflow-hidden">
          {children}
        </div>
      )}

      {/* Chat content */}
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
