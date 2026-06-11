"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { MemeModal } from "@/components/meme-modal"

interface MemeContextType {
  openMemeModal: () => void
}

const MemeContext = createContext<MemeContextType | undefined>(undefined)

export function MemeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openMemeModal = () => setOpen(true)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("coursebridge:open-meme-modal", handler)
    return () => window.removeEventListener("coursebridge:open-meme-modal", handler)
  }, [])

  return (
    <MemeContext.Provider value={{ openMemeModal }}>
      {children}
      <MemeModal open={open} onOpenChange={setOpen} />
    </MemeContext.Provider>
  )
}

export function useMemeModal() {
  const context = useContext(MemeContext)
  if (!context) {
    throw new Error("useMemeModal must be used within MemeProvider")
  }
  return context
}
