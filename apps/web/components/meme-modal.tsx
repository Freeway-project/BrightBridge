"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { getRandomMeme } from "@/lib/meme-api"

interface MemeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Meme {
  title: string
  url: string
}

export function MemeModal({ open, onOpenChange }: MemeModalProps) {
  const [meme, setMeme] = useState<Meme | null>(null)
  const [loading, setLoading] = useState(false)

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Icebreaker Meme 😄</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : meme ? (
            <>
              <img
                src={meme.url}
                alt={meme.title}
                className="max-h-96 max-w-full rounded-lg object-contain"
              />
              <p className="text-sm font-medium text-foreground text-center">{meme.title}</p>
              <Button onClick={fetchMeme} variant="outline" className="mt-4">
                Get Another Meme
              </Button>
            </>
          ) : (
            <Button onClick={fetchMeme} className="mt-4">
              Load Meme
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
