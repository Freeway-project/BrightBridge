"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, RotateCw, Sparkles, Flame } from "lucide-react"
import { getRandomMeme, getTrendingMeme } from "@/lib/meme-api"

interface MemeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Meme {
  title: string
  url: string
}

const MESSAGES = [
  "Take a break! 😄",
  "You deserve a laugh! 🤣",
  "Quick mental break? 😂",
  "Smile moment! 😊",
  "Need a pick-me-up? 🎉",
  "Laugh therapy time! 😆",
  "Let's lighten the mood 💫",
  "Fun break incoming! 🚀",
  "Meme time! Let's go! 🎬",
  "Cheer up, buttercup! 🌼",
  "Time to smile! ✨",
  "Meme magic incoming! ✨🎭",
  "Laughter is the best medicine! 💊",
  "Escape the chaos! 🌈",
  "You're crushing it! Treat yourself! 🏆",
]

export function MemeModal({ open, onOpenChange }: MemeModalProps) {
  const [meme, setMeme] = useState<Meme | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"trending" | "random">("trending")

  const randomMessage = useMemo(() => {
    return MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
  }, [open])

  const fetchMeme = async (fetchMode?: "trending" | "random") => {
    setLoading(true)
    try {
      const targetMode = fetchMode || mode
      const newMeme = targetMode === "trending" ? await getTrendingMeme() : await getRandomMeme()
      if (newMeme) {
        setMeme(newMeme)
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = async (newMode: "trending" | "random") => {
    if (newMode !== mode) {
      setMode(newMode)
      await fetchMeme(newMode)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !meme) {
      fetchMeme()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl border-0 bg-gradient-to-br from-background via-background to-accent/20 shadow-lg">
        {/* Header */}
        <div className="space-y-3 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {randomMessage}
            </h2>
          </div>

          {/* Mode Toggle */}
          {meme && (
            <div className="flex gap-2">
              <Button
                variant={mode === "trending" ? "default" : "outline"}
                size="sm"
                onClick={() => switchMode("trending")}
                disabled={loading}
                className="gap-1 text-xs"
              >
                <Flame className="h-3 w-3" />
                Trending
              </Button>
              <Button
                variant={mode === "random" ? "default" : "outline"}
                size="sm"
                onClick={() => switchMode("random")}
                disabled={loading}
                className="gap-1 text-xs"
              >
                <Sparkles className="h-3 w-3" />
                Random
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col items-center gap-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading your laugh...</p>
            </div>
          ) : meme ? (
            <>
              {/* Meme Image - Main Focus */}
              <div className="w-full max-w-md">
                <button
                  onClick={() => fetchMeme()}
                  className="group relative w-full overflow-hidden rounded-xl bg-muted p-2 transition-all hover:shadow-lg hover:shadow-primary/20"
                  title="Click to load next meme"
                >
                  <img
                    src={meme.url}
                    alt="meme"
                    className="max-h-96 w-full rounded-lg object-contain transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                    <RotateCw className="h-8 w-8 text-white" />
                  </div>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => fetchMeme()}
                  className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                >
                  <RotateCw className="h-4 w-4" />
                  Next
                </Button>
              </div>
            </>
          ) : (
            <Button
              onClick={() => fetchMeme()}
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Load First Meme
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Click the meme to load another one! 😄
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
