"use client"

import { RefreshHeader } from "@/components/shared/refresh-header"
import { useAutoRefresh } from "@/lib/workspace/use-auto-refresh"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

interface QueueRefreshWrapperProps {
  children: React.ReactNode
}

export function QueueRefreshWrapper({ children }: QueueRefreshWrapperProps) {
  const router = useRouter()
  const refresh = useCallback(async () => {
    router.refresh()
  }, [router])

  // Auto-refresh every 15 seconds for review queue (critical: new TA submissions)
  useAutoRefresh(refresh, 15000)

  return (
    <div className="flex flex-col gap-4 h-full">
      <RefreshHeader onRefresh={refresh} title="Review Queue" />
      {children}
    </div>
  )
}
