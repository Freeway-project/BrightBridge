"use client"

import { RefreshHeader } from "@/components/shared/refresh-header"
import { useAutoRefresh } from "@/lib/workspace/use-auto-refresh"
import { refreshTAWorkspace } from "@/app/(dashboard)/refresh-actions"

interface TaRefreshWrapperProps {
  children: React.ReactNode
}

export function TaRefreshWrapper({ children }: TaRefreshWrapperProps) {
  // Auto-refresh every 10 seconds when tab is visible (TAs are more active)
  useAutoRefresh(refreshTAWorkspace, 10000)

  return (
    <div className="flex flex-col gap-4 h-full">
      <RefreshHeader onRefresh={refreshTAWorkspace} title="My Courses" />
      {children}
    </div>
  )
}
