"use client"

import { RefreshHeader } from "@/components/shared/refresh-header"
import { useAutoRefresh } from "@/lib/workspace/use-auto-refresh"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

interface AdminRefreshWrapperProps {
  title: string
  children: React.ReactNode
}

export function AdminRefreshWrapper({ title, children }: AdminRefreshWrapperProps) {
  const router = useRouter()
  const refresh = useCallback(async () => {
    router.refresh()
  }, [router])

  // Auto-refresh every 30 seconds when tab is visible
  useAutoRefresh(refresh, 30000)

  return (
    <div>
      <RefreshHeader onRefresh={refresh} title={title} />
      {children}
    </div>
  )
}
