"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"

const STICKERS = [
  "🌟", "🎯", "🌈", "🔥", "🚀", "💎", "🎨", "⚡", "🧘", "🧠"
]

export function StickerPlop() {
  const [sticker, setSticker] = useState("")
  
  useEffect(() => {
    setSticker(STICKERS[Math.floor(Math.random() * STICKERS.length)])
  }, [])

  if (!sticker) return null

  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 10 }}
      transition={{ type: "spring", damping: 10, stiffness: 200 }}
      className="inline-block p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border-4 border-primary/20 select-none cursor-default"
    >
      <div className="text-5xl">{sticker}</div>
      <div className="mt-2 text-center font-bold text-primary text-sm uppercase tracking-wider">
        Great Job!
      </div>
    </motion.div>
  )
}
