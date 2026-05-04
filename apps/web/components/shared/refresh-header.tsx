"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

interface RefreshHeaderProps {
  onRefresh: () => Promise<void>
  title: string
}

export function RefreshHeader({ onRefresh, title }: RefreshHeaderProps) {
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)

  const handleManualRefresh = useCallback(async () => {
    setIsLoading(true)
    try {
      await onRefresh()
      setLastRefresh(new Date())
    } catch (error) {
      console.error("Refresh failed:", error)
    } finally {
      setIsLoading(false)
    }
  }, [onRefresh])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          Updated: <span className="font-mono">{formatTime(lastRefresh)}</span>
        </span>
        <Button
          onClick={handleManualRefresh}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {isLoading ? "..." : "🔄 Refresh"}
        </Button>
      </div>
    </div>
  )
}
