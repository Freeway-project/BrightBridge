"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Sparkles } from "lucide-react"
import { refreshTAWorkspace } from "@/app/(dashboard)/refresh-actions"
import { cn } from "@/lib/utils"
import { useMemeModal } from "@/components/providers/meme-provider"

interface TaDashboardHeaderProps {
  firstName: string
}

export function TaDashboardHeader({ firstName }: TaDashboardHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { openMemeModal } = useMemeModal()

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshTAWorkspace()
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  return (
    <div className="relative mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="h-8 w-fit gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
          <span className="text-xs font-medium">Refresh</span>
        </Button>
        
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Hey, <span className="bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">{firstName}</span>.
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={openMemeModal}
            title="Need a laugh? Click for a meme!"
            className="h-10 w-10 ml-2 hover:text-primary transition-colors"
          >
            <Sparkles className="size-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
