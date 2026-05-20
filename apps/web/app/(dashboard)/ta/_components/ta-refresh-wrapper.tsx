"use client"

import { useAutoRefresh } from "@/lib/workspace/use-auto-refresh"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

interface TaRefreshWrapperProps {
  children: React.ReactNode
}

export function TaRefreshWrapper({ children }: TaRefreshWrapperProps) {
  const router = useRouter()
  const refresh = useCallback(async () => {
    router.refresh()
  }, [router])

  // Auto-refresh every 10 seconds when tab is visible (TAs are more active)
  useAutoRefresh(refresh, 10000)

  return (
    <div className="flex flex-col gap-4 h-full">
      {children}
    </div>
  )
}
