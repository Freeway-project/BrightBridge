"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

type Gif = { id: string; url: string; title: string }

// Shown over the output panel while a conversion is running. Fetches a batch of
// funny/trending GIFs from our server-side Giphy proxy and rotates through them
// one at a time until the conversion finishes. If Giphy is unavailable (no key,
// network error), it quietly falls back to a simple spinner so the loading
// state still reads clearly.
export function GiphyLoader() {
  const [gifs, setGifs] = useState<Gif[]>([])
  const [idx, setIdx] = useState(0)
  const [ready, setReady] = useState(false)

  // Fetch one batch on mount. Pick a random mood each time so the loader feels
  // fresh — funny / happy / dancing, or trending (no search term).
  useEffect(() => {
    let cancelled = false
    const moods = ["funny", "happy", "dancing", "celebrate", ""]
    const mood = moods[Math.floor(Math.random() * moods.length)]
    const endpoint = mood ? `/api/giphy?q=${encodeURIComponent(mood)}&limit=30` : "/api/giphy?limit=30"
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : { gifs: [] }))
      .then((d: { gifs?: Gif[] }) => {
        if (cancelled) return
        const list = d.gifs ?? []
        // Shuffle so each conversion shows a different sequence.
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[list[i], list[j]] = [list[j], list[i]]
        }
        setGifs(list)
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Advance one GIF at a time.
  useEffect(() => {
    if (gifs.length < 2) return
    const t = setInterval(() => setIdx((i) => (i + 1) % gifs.length), 2600)
    return () => clearInterval(t)
  }, [gifs])

  const current = gifs[idx]

  // Fallback spinner: no GIFs available yet, or Giphy returned nothing.
  if (!current) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="size-10 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">
          {ready ? "Converting your document…" : "Loading…"}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-[240px] w-[min(40vw,360px)] items-center justify-center overflow-hidden rounded-xl bg-muted/40 shadow-lg ring-1 ring-border">
        <AnimatePresence mode="wait">
          <motion.img
            key={current.id}
            src={current.url}
            alt={current.title || "Loading animation"}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.45 }}
            className="max-h-full max-w-full object-contain"
          />
        </AnimatePresence>
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Hang tight — converting your document…
      </p>
      {/* Preload the next GIF so the swap is instant. */}
      {gifs[(idx + 1) % gifs.length] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={gifs[(idx + 1) % gifs.length].url} alt="" className="hidden" aria-hidden />
      )}
    </div>
  )
}
