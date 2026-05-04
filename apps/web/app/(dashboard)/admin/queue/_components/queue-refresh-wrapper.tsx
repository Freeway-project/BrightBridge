"use client"

import { RefreshHeader } from "@/components/shared/refresh-header"
import { useAutoRefresh } from "@/lib/workspace/use-auto-refresh"
import { refreshAdminQueue } from "@/app/(dashboard)/refresh-actions"

interface QueueRefreshWrapperProps {
  children: React.ReactNode
}

export function QueueRefreshWrapper({ children }: QueueRefreshWrapperProps) {
  // Auto-refresh every 15 seconds for review queue (critical: new TA submissions)
  useAutoRefresh(refreshAdminQueue, 15000)

  return (
    <div className="flex flex-col gap-4 h-full">
      <RefreshHeader onRefresh={refreshAdminQueue} title="Review Queue" />
      {children}
    </div>
  )
}
