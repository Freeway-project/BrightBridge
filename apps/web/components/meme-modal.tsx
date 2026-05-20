"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, RotateCw } from "lucide-react"
import { getRandomMeme } from "@/lib/meme-api"

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

  const randomMessage = useMemo(() => {
    return MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
  }, [open])

  const fetchMeme = async () => {
    setLoading(true)
    try {
      const newMeme = await getRandomMeme()
      if (newMeme) {
        setMeme(newMeme)
      }
    } finally {
      setLoading(false)
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
        {/* Header with personalized message */}
        <div className="space-y-2 pb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {randomMessage}
          </h2>
          <p className="text-xs text-muted-foreground">Quick relief for course reviewers</p>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center gap-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading something funny...</p>
            </div>
          ) : meme ? (
            <>
              {/* Meme Image */}
              <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-muted p-2">
                <img
                  src={meme.url}
                  alt={meme.title}
                  className="max-h-96 w-full rounded-lg object-contain"
                />
              </div>

              {/* Meme Title */}
              <div className="text-center">
                <p className="text-sm font-medium text-foreground line-clamp-2 px-4">
                  {meme.title}
                </p>
              </div>

              {/* Action Button */}
              <Button
                onClick={fetchMeme}
                variant="default"
                className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              >
                <RotateCw className="h-4 w-4" />
                Next Meme 🎬
              </Button>
            </>
          ) : (
            <Button onClick={fetchMeme} size="lg" className="bg-gradient-to-r from-primary to-secondary">
              Load First Meme ✨
            </Button>
          )}
        </div>

        {/* Footer message */}
        <div className="border-t border-border/50 pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Come back anytime you need a quick laugh! 😄
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
