"use client"

import { RefreshHeader } from "@/components/shared/refresh-header"
import { useAutoRefresh } from "@/lib/workspace/use-auto-refresh"
import { refreshAdminDashboard } from "@/app/(dashboard)/refresh-actions"

interface AdminRefreshWrapperProps {
  title: string
  children: React.ReactNode
}

export function AdminRefreshWrapper({ title, children }: AdminRefreshWrapperProps) {
  // Auto-refresh every 30 seconds when tab is visible
  useAutoRefresh(refreshAdminDashboard, 30000)

  return (
    <div>
      <RefreshHeader onRefresh={refreshAdminDashboard} title={title} />
      {children}
    </div>
  )
}
